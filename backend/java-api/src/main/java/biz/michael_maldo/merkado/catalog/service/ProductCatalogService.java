package biz.michael_maldo.merkado.catalog.service;

import biz.michael_maldo.merkado.catalog.dto.ProductDtos;
import biz.michael_maldo.merkado.catalog.entity.*;
import biz.michael_maldo.merkado.catalog.repository.*;
import biz.michael_maldo.merkado.inventory.entity.Stock;
import biz.michael_maldo.merkado.inventory.repository.StockRepository;
import biz.michael_maldo.merkado.shared.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductCatalogService {
    private final ProductRepository products;
    private final ProductVariantRepository variants;
    private final CategoryRepository categories;
    private final BrandRepository brands;
    private final VariantOptionTypeRepository optionTypes;
    private final VariantOptionValueRepository optionValues;
    private final VariantOptionAssignmentRepository assignments;
    private final ProductImageRepository images;
    private final VariantPackagingRepository packaging;
    private final ProductCustomsInfoRepository customs;
    private final ProductCostInfoRepository costs;
    private final ChannelRepository channels;
    private final ProductChannelListingRepository listings;
    private final StockRepository stocks;

    @Transactional
    public ProductDtos.Detail create(ProductDtos.Create request) {
        var requestedVariants = normalizedVariants(request);
        validateCreate(request, requestedVariants);
        var defaultRequest = requestedVariants.stream()
            .filter(v -> Boolean.TRUE.equals(v.defaultVariant()))
            .findFirst()
            .orElse(requestedVariants.getFirst());

        var product = new Product();
        product.setMasterName(required(firstNonBlank(request.masterName(), request.name()), "Master product name"));
        product.setName(product.getMasterName());
        product.setUpc(trimToNull(request.upc()));
        product.setSpu(required(firstNonBlank(request.spu(), request.sku()), "SPU").toUpperCase(Locale.ROOT));
        product.setCategory(resolveCategory(request.categoryId()));
        product.setBrand(resolveBrand(request.brandId()));
        product.setCondition(request.condition() == null ? ProductCondition.NEW : request.condition());
        product.setShelfLifeDays(request.shelfLifeDays());
        product.setMinimumPurchaseQuantity(request.minimumPurchaseQuantity() == null ? 1 : request.minimumPurchaseQuantity());
        product.setShortDescription(required(firstNonBlank(request.shortDescription(), product.getMasterName()), "Short description"));
        product.setLongDescription(required(firstNonBlank(request.longDescription(), request.shortDescription(), product.getMasterName()), "Long description"));
        product.setHasVariations(Boolean.TRUE.equals(request.hasVariations()) || requestedVariants.size() > 1 || !safe(request.optionTypes()).isEmpty());
        product.setPreorder(Boolean.TRUE.equals(request.preorder()));
        product.setRemarks1(trimToNull(request.remarks1()));
        product.setRemarks2(trimToNull(request.remarks2()));
        product.setRemarks3(trimToNull(request.remarks3()));
        mirrorLegacyProductFields(product, defaultRequest);
        product = products.saveAndFlush(product);

        var valuesByName = createOptionDefinitions(product, safe(request.optionTypes()));
        var generatedDefault = variants.findByProductIdAndDefaultVariantTrue(product.getId())
            .orElseThrow(() -> new BusinessException("Default variant was not generated"));

        var variantsBySku = new LinkedHashMap<String, ProductVariant>();
        configureVariant(generatedDefault, product, defaultRequest, true);
        generatedDefault = variants.saveAndFlush(generatedDefault);
        variantsBySku.put(generatedDefault.getSku().toLowerCase(Locale.ROOT), generatedDefault);
        createVariantDetails(generatedDefault, defaultRequest, valuesByName);

        for (var variantRequest : requestedVariants) {
            if (variantRequest == defaultRequest) continue;
            var variant = new ProductVariant();
            configureVariant(variant, product, variantRequest, false);
            variant = variants.saveAndFlush(variant);
            variantsBySku.put(variant.getSku().toLowerCase(Locale.ROOT), variant);
            createVariantDetails(variant, variantRequest, valuesByName);
        }

        createImages(product, request.images(), variantsBySku);
        saveCustoms(product, request.customs());
        saveCost(product, request.cost());
        createListings(product, request.channelListings());
        return detail(product.getId());
    }

    @Transactional(readOnly = true)
    public List<ProductDtos.Summary> list(String query) {
        List<Product> result = query == null || query.isBlank()
            ? products.findAll()
            : products.findByMasterNameContainingIgnoreCaseOrSpuContainingIgnoreCase(query.trim(), query.trim());
        return result.stream().map(this::summary).toList();
    }

    @Transactional(readOnly = true)
    public List<ProductDtos.Summary> listCategoryTree(Long categoryId) {
        if (!categories.existsById(categoryId)) throw new BusinessException("Category not found");
        return products.findAllInCategoryTree(categoryId).stream().map(this::summary).toList();
    }

    @Transactional(readOnly = true)
    public ProductDtos.Detail detail(Long productId) {
        var product = product(productId);
        var productVariants = variants.findAllByProductIdOrderById(productId);
        var productOptions = optionTypes.findAllByProductIdOrderBySortOrderAscIdAsc(productId);
        var productImages = images.findAllByProductIdOrderBySortOrderAscIdAsc(productId);
        var productListings = listings.findAllByProductIdOrderById(productId);
        var summary = summary(product);
        return new ProductDtos.Detail(
            product.getId(), product.getMasterName(), product.getMasterName(), product.getUpc(), product.getSpu(),
            summary.sku(), summary.price(), summary.quantity(), summary.reserved(), summary.available(),
            product.getCategory().getId(), product.getCategory().getName(),
            product.getBrand().getId(), product.getBrand().getName(), product.getCondition(),
            product.getShelfLifeDays(), product.getMinimumPurchaseQuantity(), product.getShortDescription(),
            product.getLongDescription(), product.isHasVariations(), product.isPreorder(),
            product.getRemarks1(), product.getRemarks2(), product.getRemarks3(), product.isActive(),
            product.getCreatedAt(), product.getUpdatedAt(),
            productOptions.stream().map(this::optionTypeView).toList(),
            productVariants.stream().map(this::variantView).toList(),
            productImages.stream().map(i -> new ProductDtos.ImageView(i.getId(), i.getImageUrl(), i.getAltText(), i.isPrimary(), i.getSortOrder(), i.getVariant() == null ? null : i.getVariant().getId())).toList(),
            customs.findById(productId).map(c -> new ProductDtos.CustomsView(c.getChineseName(), c.getEnglishName(), c.getHsCode(), c.getInvoiceAmount(), c.getInvoiceCurrency(), c.getGrossWeightKg())).orElse(null),
            costs.findById(productId).map(c -> new ProductDtos.CostView(c.getSourceUrl(), c.getPurchaseDurationDays(), c.getSalesTaxAmount(), c.getTaxCurrency())).orElse(null),
            productListings.stream().map(l -> new ProductDtos.ChannelListingView(l.getId(), l.getChannel().getId(), l.getChannel().getCode(), l.getChannel().getName(), l.getSellingStatus(), l.getExternalProductId())).toList()
        );
    }

    @Transactional
    public ProductDtos.Detail updateMaster(Long id, ProductDtos.MasterUpdate request) {
        var p = product(id);
        String requestedName = firstNonBlank(request.masterName(), request.name());
        if (requestedName != null) { p.setMasterName(required(requestedName, "Master product name")); p.setName(p.getMasterName()); }
        if (request.upc() != null) p.setUpc(trimToNull(request.upc()));
        if (request.spu() != null) p.setSpu(required(request.spu(), "SPU").toUpperCase(Locale.ROOT));
        if (request.categoryId() != null) p.setCategory(resolveCategory(request.categoryId()));
        if (request.brandId() != null) p.setBrand(resolveBrand(request.brandId()));
        if (request.condition() != null) p.setCondition(request.condition());
        if (request.shelfLifeDays() != null) p.setShelfLifeDays(request.shelfLifeDays());
        if (request.minimumPurchaseQuantity() != null) p.setMinimumPurchaseQuantity(request.minimumPurchaseQuantity());
        if (request.shortDescription() != null) p.setShortDescription(required(request.shortDescription(), "Short description"));
        if (request.longDescription() != null) p.setLongDescription(required(request.longDescription(), "Long description"));
        if (request.hasVariations() != null) p.setHasVariations(request.hasVariations());
        if (request.preorder() != null) p.setPreorder(request.preorder());
        if (request.remarks1() != null) p.setRemarks1(trimToNull(request.remarks1()));
        if (request.remarks2() != null) p.setRemarks2(trimToNull(request.remarks2()));
        if (request.remarks3() != null) p.setRemarks3(trimToNull(request.remarks3()));
        if (request.active() != null) p.setActive(request.active());
        var defaultVariant = variants.findByProductIdAndDefaultVariantTrue(id).orElseThrow(() -> new BusinessException("Default variant not found"));
        if (request.sku() != null) { validateVariantIdentity(request.sku(), defaultVariant.getBarcode(), defaultVariant.getId()); defaultVariant.setSku(normalizeCode(request.sku())); }
        if (request.price() != null) defaultVariant.setSellingPrice(request.price());
        if (request.sku() != null || request.price() != null) {
            defaultVariant.setUpdatedAt(LocalDateTime.now()); variants.saveAndFlush(defaultVariant); mirrorLegacyFromVariant(p, defaultVariant);
        }
        p.setUpdatedAt(LocalDateTime.now());
        products.saveAndFlush(p);
        return detail(id);
    }

    @Transactional
    public ProductDtos.OptionTypeView addOptionType(Long productId, ProductDtos.OptionTypeRequest request) {
        var product = product(productId);
        String name = required(request.name(), "Option type name");
        if (optionTypes.findAllByProductIdOrderBySortOrderAscIdAsc(productId).stream().anyMatch(t -> t.getName().equalsIgnoreCase(name)))
            throw new BusinessException("Option type already exists");
        var type = new VariantOptionType(); type.setProduct(product); type.setName(name);
        type.setSortOrder(optionTypes.findAllByProductIdOrderBySortOrderAscIdAsc(productId).size());
        addOptionValues(type, request.values());
        return optionTypeView(optionTypes.saveAndFlush(type));
    }

    @Transactional
    public ProductDtos.VariantView addVariant(Long productId, ProductDtos.VariantRequest request) {
        var product = product(productId);
        validateVariantIdentity(request.sku(), request.barcode(), null);
        validateOptionCombination(productId, request.options(), null);
        if (Boolean.TRUE.equals(request.defaultVariant())) clearDefault(productId);
        var variant = new ProductVariant();
        configureVariant(variant, product, request, Boolean.TRUE.equals(request.defaultVariant()));
        variant = variants.saveAndFlush(variant);
        createVariantDetails(variant, request, optionValueMap(productId));
        if (variant.isDefaultVariant()) mirrorLegacyFromVariant(product, variant);
        product.setHasVariations(variants.findAllByProductIdOrderById(productId).size() > 1 || !optionTypes.findAllByProductIdOrderBySortOrderAscIdAsc(productId).isEmpty());
        return variantView(variant);
    }

    @Transactional
    public ProductDtos.VariantView updateVariant(Long productId, Long variantId, ProductDtos.VariantUpdate request) {
        var variant = variant(productId, variantId);
        boolean resultingActive = request.active() == null ? variant.isActive() : request.active();
        boolean resultingDefault = Boolean.TRUE.equals(request.defaultVariant()) || variant.isDefaultVariant();
        if (!resultingActive && resultingDefault)
            throw new BusinessException("The default variant cannot be deactivated. Make another active variant the default first");
        if (request.options() != null) validateOptionCombination(productId, request.options(), variantId);
        if (request.sku() != null || request.barcode() != null)
            validateVariantIdentity(request.sku() == null ? variant.getSku() : request.sku(), request.barcode() == null ? variant.getBarcode() : request.barcode(), variantId);
        if (request.sku() != null) variant.setSku(normalizeCode(request.sku()));
        if (request.barcode() != null) variant.setBarcode(required(request.barcode(), "Barcode"));
        if (request.variantName() != null) { variant.setVariantName(required(request.variantName(), "Variant name")); variant.setName(variant.getVariantName()); }
        if (request.sellingPrice() != null) variant.setSellingPrice(request.sellingPrice());
        if (request.active() != null) variant.setActive(request.active());
        if (Boolean.TRUE.equals(request.defaultVariant()) && !variant.isDefaultVariant()) { clearDefault(productId); variant.setDefaultVariant(true); }
        variant.setUpdatedAt(LocalDateTime.now());
        variant = variants.saveAndFlush(variant);
        if (request.options() != null) replaceAssignments(variant, request.options(), optionValueMap(productId));
        if (request.packaging() != null) savePackaging(variant, request.packaging());
        if (variant.isDefaultVariant()) mirrorLegacyFromVariant(product(productId), variant);
        return variantView(variant);
    }

    @Transactional
    public void archive(Long productId) {
        var p = product(productId); p.setActive(false); p.setUpdatedAt(LocalDateTime.now());
        variants.findAllByProductIdOrderById(productId).forEach(v -> { v.setActive(false); v.setUpdatedAt(LocalDateTime.now()); });
    }

    private ProductDtos.Summary summary(Product product) {
        var productVariants = variants.findAllByProductIdOrderById(product.getId());
        var stockRows = stocks.findAllByProductId(product.getId());
        int quantity = stockRows.stream().mapToInt(Stock::getQuantity).sum();
        int reserved = stockRows.stream().mapToInt(Stock::getReserved).sum();
        var defaultVariant = productVariants.stream().filter(ProductVariant::isDefaultVariant).findFirst().orElse(null);
        return new ProductDtos.Summary(product.getId(), product.getMasterName(), product.getMasterName(), product.getUpc(), product.getSpu(),
            product.getCategory().getId(), product.getCategory().getName(), product.getBrand().getId(), product.getBrand().getName(),
            defaultVariant == null ? product.getSku() : defaultVariant.getSku(), defaultVariant == null ? product.getPrice() : defaultVariant.getSellingPrice(),
            product.isActive(), productVariants.size(), quantity, reserved, quantity - reserved);
    }

    private ProductDtos.OptionTypeView optionTypeView(VariantOptionType type) {
        return new ProductDtos.OptionTypeView(type.getId(), type.getName(), type.getSortOrder(), type.isActive(),
            type.getValues().stream().map(v -> new ProductDtos.OptionValueView(v.getId(), v.getValue(), v.getSortOrder(), v.isActive())).toList());
    }

    private ProductDtos.VariantView variantView(ProductVariant variant) {
        var stock = stocks.findByVariantId(variant.getId()).orElse(null);
        var optionMap = assignments.findAllByVariantId(variant.getId()).stream().collect(Collectors.toMap(
            a -> a.getOptionType().getName(), a -> a.getOptionValue().getValue(), (a, b) -> a, LinkedHashMap::new));
        var packageView = packaging.findById(variant.getId()).map(p -> new ProductDtos.PackagingView(p.getLengthCm(), p.getWidthCm(), p.getHeightCm(), p.getWeightKg())).orElse(null);
        int quantity = stock == null ? 0 : stock.getQuantity(); int reserved = stock == null ? 0 : stock.getReserved();
        return new ProductDtos.VariantView(variant.getId(), variant.getSku(), variant.getBarcode(), variant.getVariantName(), variant.getSellingPrice(),
            variant.isDefaultVariant(), variant.isActive(), optionMap, packageView, quantity, reserved, quantity - reserved);
    }

    private Map<String, VariantOptionValue> createOptionDefinitions(Product product, List<ProductDtos.OptionTypeRequest> requests) {
        var result = new HashMap<String, VariantOptionValue>();
        var seenTypes = new HashSet<String>();
        for (int i = 0; i < requests.size(); i++) {
            var request = requests.get(i); String typeName = required(request.name(), "Option type name");
            if (!seenTypes.add(key(typeName))) throw new BusinessException("Duplicate option type: " + typeName);
            var type = new VariantOptionType(); type.setProduct(product); type.setName(typeName); type.setSortOrder(i);
            addOptionValues(type, request.values()); type = optionTypes.saveAndFlush(type);
            for (var value : type.getValues()) result.put(optionKey(type.getName(), value.getValue()), value);
        }
        return result;
    }

    private void addOptionValues(VariantOptionType type, List<String> requestedValues) {
        var seen = new HashSet<String>(); int index = 0;
        for (String raw : safe(requestedValues)) {
            String value = required(raw, "Option value");
            if (!seen.add(key(value))) throw new BusinessException("Duplicate option value: " + value);
            var entity = new VariantOptionValue(); entity.setOptionType(type); entity.setValue(value); entity.setSortOrder(index++);
            type.getValues().add(entity);
        }
        if (type.getValues().isEmpty()) throw new BusinessException("An option type requires at least one value");
    }

    private void createVariantDetails(ProductVariant variant, ProductDtos.VariantRequest request, Map<String, VariantOptionValue> valuesByName) {
        replaceAssignments(variant, request.options(), valuesByName);
        if (request.packaging() != null) savePackaging(variant, request.packaging());
        var stock = new Stock(); stock.setProduct(variant.getProduct()); stock.setVariant(variant); stock.setQuantity(request.initialStock() == null ? 0 : request.initialStock());
        stocks.save(stock);
    }

    private void replaceAssignments(ProductVariant variant, Map<String, String> requested, Map<String, VariantOptionValue> valuesByName) {
        assignments.deleteAllByVariantId(variant.getId());
        var seenTypes = new HashSet<Long>();
        for (var entry : safeMap(requested).entrySet()) {
            var value = valuesByName.get(optionKey(entry.getKey(), entry.getValue()));
            if (value == null) throw new BusinessException("Unknown option selection: " + entry.getKey() + " = " + entry.getValue());
            if (!seenTypes.add(value.getOptionType().getId())) throw new BusinessException("A variant can select only one value per option type");
            var assignment = new VariantOptionAssignment(); assignment.setId(new VariantOptionAssignmentId(variant.getId(), value.getId()));
            assignment.setVariant(variant); assignment.setOptionValue(value); assignment.setOptionType(value.getOptionType()); assignments.save(assignment);
        }
    }

    private void savePackaging(ProductVariant variant, ProductDtos.PackagingRequest request) {
        var entity = packaging.findById(variant.getId()).orElseGet(VariantPackaging::new);
        entity.setVariant(variant); entity.setLengthCm(request.lengthCm()); entity.setWidthCm(request.widthCm()); entity.setHeightCm(request.heightCm()); entity.setWeightKg(request.weightKg()); entity.setUpdatedAt(LocalDateTime.now());
        packaging.save(entity);
    }

    private void createImages(Product product, List<ProductDtos.ImageRequest> requests, Map<String, ProductVariant> variantsBySku) {
        for (var request : safe(requests)) {
            var image = new ProductImage(); image.setProduct(product); image.setImageUrl(required(request.imageUrl(), "Image URL")); image.setAltText(trimToNull(request.altText()));
            image.setPrimary(Boolean.TRUE.equals(request.primary())); image.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
            if (request.variantSku() != null) {
                var variant = variantsBySku.get(key(request.variantSku()));
                if (variant == null) throw new BusinessException("Image references unknown variant SKU: " + request.variantSku());
                image.setVariant(variant);
            }
            images.save(image);
        }
    }

    private void saveCustoms(Product product, ProductDtos.CustomsRequest request) {
        if (request == null) return;
        var entity = new ProductCustomsInfo(); entity.setProduct(product); entity.setChineseName(trimToNull(request.chineseName())); entity.setEnglishName(trimToNull(request.englishName()));
        entity.setHsCode(trimToNull(request.hsCode())); entity.setInvoiceAmount(request.invoiceAmount()); entity.setInvoiceCurrency(upper(request.invoiceCurrency())); entity.setGrossWeightKg(request.grossWeightKg()); customs.save(entity);
    }

    private void saveCost(Product product, ProductDtos.CostRequest request) {
        if (request == null) return;
        var entity = new ProductCostInfo(); entity.setProduct(product); entity.setSourceUrl(trimToNull(request.sourceUrl())); entity.setPurchaseDurationDays(request.purchaseDurationDays());
        entity.setSalesTaxAmount(request.salesTaxAmount()); entity.setTaxCurrency(upper(request.taxCurrency())); costs.save(entity);
    }

    private void createListings(Product product, List<ProductDtos.ChannelListingRequest> requests) {
        var used = new HashSet<Long>();
        for (var request : safe(requests)) {
            if (!used.add(request.channelId())) throw new BusinessException("Duplicate channel listing");
            var listing = new ProductChannelListing(); listing.setProduct(product); listing.setChannel(channels.findById(request.channelId()).orElseThrow(() -> new BusinessException("Channel not found")));
            listing.setSellingStatus(request.sellingStatus()); listing.setExternalProductId(trimToNull(request.externalProductId())); listings.save(listing);
        }
    }

    private void configureVariant(ProductVariant entity, Product product, ProductDtos.VariantRequest request, boolean forceDefault) {
        validateVariantIdentity(request.sku(), request.barcode(), entity.getId());
        entity.setProduct(product); entity.setSku(normalizeCode(request.sku())); entity.setBarcode(required(request.barcode(), "Barcode"));
        String name = firstNonBlank(request.variantName(), forceDefault && !product.isHasVariations() ? "Default" : request.sku());
        entity.setVariantName(required(name, "Variant name")); entity.setName(entity.getVariantName()); entity.setSellingPrice(request.sellingPrice());
        entity.setPriceAdjustment(request.sellingPrice().subtract(product.getPrice())); entity.setDefaultVariant(forceDefault); entity.setActive(request.active() == null || request.active()); entity.setUpdatedAt(LocalDateTime.now());
    }

    private void validateCreate(ProductDtos.Create request, List<ProductDtos.VariantRequest> requestedVariants) {
        String spu = required(firstNonBlank(request.spu(), request.sku()), "SPU");
        if (products.existsBySpuIgnoreCase(spu)) throw new BusinessException("SPU already exists");
        if (request.upc() != null && !request.upc().isBlank() && products.existsByUpcIgnoreCase(request.upc().trim())) throw new BusinessException("UPC already exists");
        long defaults = requestedVariants.stream().filter(v -> Boolean.TRUE.equals(v.defaultVariant())).count();
        if (defaults > 1) throw new BusinessException("Only one variant can be the default");
        var combinations = new HashSet<String>();
        for (var variant : requestedVariants) {
            validateVariantIdentity(variant.sku(), variant.barcode(), null);
            String combination = safeMap(variant.options()).entrySet().stream().sorted(Map.Entry.comparingByKey(String.CASE_INSENSITIVE_ORDER)).map(e -> key(e.getKey()) + "=" + key(e.getValue())).collect(Collectors.joining("|"));
            if (!combination.isEmpty() && !combinations.add(combination)) throw new BusinessException("Duplicate variant option combination");
        }
    }

    private void validateVariantIdentity(String sku, String barcode, Long currentId) {
        String normalizedSku = normalizeCode(sku); String normalizedBarcode = required(barcode, "Barcode");
        variants.findAll().stream().filter(v -> !Objects.equals(v.getId(), currentId)).forEach(v -> {
            if (v.getSku().equalsIgnoreCase(normalizedSku)) throw new BusinessException("SKU already exists: " + normalizedSku);
            if (v.getBarcode().equalsIgnoreCase(normalizedBarcode)) throw new BusinessException("Barcode already exists: " + normalizedBarcode);
        });
    }

    private void validateOptionCombination(Long productId, Map<String, String> requestedOptions, Long currentVariantId) {
        var activeTypes = optionTypes.findAllByProductIdOrderBySortOrderAscIdAsc(productId).stream()
            .filter(VariantOptionType::isActive).toList();
        var selected = new HashMap<Long, Long>();
        for (var entry : safeMap(requestedOptions).entrySet()) {
            var value = activeTypes.stream()
                .filter(type -> type.getName().equalsIgnoreCase(entry.getKey()))
                .flatMap(type -> type.getValues().stream())
                .filter(optionValue -> optionValue.isActive() && optionValue.getValue().equalsIgnoreCase(entry.getValue()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("Unknown or inactive option selection: " + entry.getKey() + " = " + entry.getValue()));
            if (selected.put(value.getOptionType().getId(), value.getId()) != null)
                throw new BusinessException("A variant can select only one value per option type");
        }
        if (selected.size() != activeTypes.size())
            throw new BusinessException("Select one value for every active option type");

        String requestedKey = selected.entrySet().stream().sorted(Map.Entry.comparingByKey())
            .map(entry -> entry.getKey() + "=" + entry.getValue()).collect(Collectors.joining("|"));
        boolean duplicate = variants.findAllByProductIdOrderById(productId).stream()
            .filter(existing -> !Objects.equals(existing.getId(), currentVariantId))
            .anyMatch(existing -> assignments.findAllByVariantId(existing.getId()).stream()
                .filter(assignment -> assignment.getOptionType().isActive())
                .sorted(Comparator.comparing(assignment -> assignment.getOptionType().getId()))
                .map(assignment -> assignment.getOptionType().getId() + "=" + assignment.getOptionValue().getId())
                .collect(Collectors.joining("|")).equals(requestedKey));
        if (duplicate) throw new BusinessException("A variant with this option combination already exists");
    }

    private List<ProductDtos.VariantRequest> normalizedVariants(ProductDtos.Create request) {
        if (request.variants() != null && !request.variants().isEmpty()) return request.variants();
        return List.of(new ProductDtos.VariantRequest(required(request.sku(), "SKU"), required(request.sku(), "Barcode"), "Default",
            Objects.requireNonNullElse(request.price(), BigDecimal.ZERO), true, true, Objects.requireNonNullElse(request.initialStock(), 0), Map.of(), null));
    }

    private Map<String, VariantOptionValue> optionValueMap(Long productId) {
        return optionTypes.findAllByProductIdOrderBySortOrderAscIdAsc(productId).stream().flatMap(t -> t.getValues().stream().map(v -> Map.entry(optionKey(t.getName(), v.getValue()), v))).collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    private void clearDefault(Long productId) { variants.findByProductIdAndDefaultVariantTrue(productId).ifPresent(v -> { v.setDefaultVariant(false); variants.saveAndFlush(v); }); }
    private void mirrorLegacyProductFields(Product product, ProductDtos.VariantRequest variant) { product.setSku(normalizeCode(variant.sku())); product.setPrice(variant.sellingPrice()); }
    private void mirrorLegacyFromVariant(Product product, ProductVariant variant) { product.setSku(variant.getSku()); product.setPrice(variant.getSellingPrice()); product.setUpdatedAt(LocalDateTime.now()); }
    private Product product(Long id) { return products.findById(id).orElseThrow(() -> new BusinessException("Product not found")); }
    private ProductVariant variant(Long productId, Long id) { var v = variants.findById(id).orElseThrow(() -> new BusinessException("Variant not found")); if (!v.getProduct().getId().equals(productId)) throw new BusinessException("Variant does not belong to product"); return v; }
    private Category resolveCategory(Long id) { return id == null ? categories.findByCodeIgnoreCase("UNCATEGORIZED").orElseThrow(() -> new BusinessException("Default category not found")) : categories.findById(id).orElseThrow(() -> new BusinessException("Category not found")); }
    private Brand resolveBrand(Long id) { return id == null ? brands.findByNameIgnoreCase("UNBRANDED").orElseThrow(() -> new BusinessException("Default brand not found")) : brands.findById(id).orElseThrow(() -> new BusinessException("Brand not found")); }
    private String normalizeCode(String value) { return required(value, "SKU").toUpperCase(Locale.ROOT); }
    private String optionKey(String type, String value) { return key(type) + "\u0000" + key(value); }
    private String key(String value) { return required(value, "Value").toLowerCase(Locale.ROOT); }
    private String upper(String value) { return value == null ? null : value.toUpperCase(Locale.ROOT); }
    private String required(String value, String field) { if (value == null || value.isBlank()) throw new BusinessException(field + " is required"); return value.trim(); }
    private String trimToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private String firstNonBlank(String... values) { return Arrays.stream(values).filter(v -> v != null && !v.isBlank()).findFirst().orElse(null); }
    private <T> List<T> safe(List<T> values) { return values == null ? List.of() : values; }
    private <K,V> Map<K,V> safeMap(Map<K,V> values) { return values == null ? Map.of() : values; }
}
