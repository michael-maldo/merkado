package biz.michael_maldo.merkado.catalog.dto;

import biz.michael_maldo.merkado.catalog.entity.ChannelSellingStatus;
import biz.michael_maldo.merkado.catalog.entity.ProductCondition;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public final class ProductDtos {
    private ProductDtos() {}

    /**
     * The legacy name/sku/price/initialStock fields keep the existing React
     * client functional. New clients should send masterName plus variants.
     */
    public record Create(
        String masterName,
        String name,
        String upc,
        String spu,
        Long categoryId,
        Long brandId,
        ProductCondition condition,
        @Positive Integer shelfLifeDays,
        @Positive Integer minimumPurchaseQuantity,
        String shortDescription,
        String longDescription,
        Boolean hasVariations,
        Boolean preorder,
        String remarks1,
        String remarks2,
        String remarks3,
        List<@Valid OptionTypeRequest> optionTypes,
        List<@Valid VariantRequest> variants,
        List<@Valid ImageRequest> images,
        @Valid CustomsRequest customs,
        @Valid CostRequest cost,
        List<@Valid ChannelListingRequest> channelListings,
        String sku,
        @DecimalMin("0.00") BigDecimal price,
        @Min(0) Integer initialStock
    ) {}

    public record MasterUpdate(
        String masterName,
        String name,
        String upc,
        String spu,
        Long categoryId,
        Long brandId,
        ProductCondition condition,
        @Positive Integer shelfLifeDays,
        @Positive Integer minimumPurchaseQuantity,
        String shortDescription,
        String longDescription,
        Boolean hasVariations,
        Boolean preorder,
        String remarks1,
        String remarks2,
        String remarks3,
        Boolean active,
        String sku,
        @DecimalMin("0.00") BigDecimal price
    ) {}

    public record OptionTypeRequest(
        @NotBlank String name,
        @NotEmpty List<@NotBlank String> values
    ) {}

    public record VariantRequest(
        @NotBlank String sku,
        @NotBlank String barcode,
        String variantName,
        @NotNull @DecimalMin("0.00") BigDecimal sellingPrice,
        Boolean defaultVariant,
        Boolean active,
        @Min(0) Integer initialStock,
        Map<String, String> options,
        @Valid PackagingRequest packaging
    ) {}

    public record VariantUpdate(
        String sku,
        String barcode,
        String variantName,
        @DecimalMin("0.00") BigDecimal sellingPrice,
        Boolean defaultVariant,
        Boolean active,
        Map<String, String> options,
        @Valid PackagingRequest packaging
    ) {}

    public record PackagingRequest(
        @NotNull @DecimalMin(value = "0", inclusive = false) BigDecimal lengthCm,
        @NotNull @DecimalMin(value = "0", inclusive = false) BigDecimal widthCm,
        @NotNull @DecimalMin(value = "0", inclusive = false) BigDecimal heightCm,
        @NotNull @DecimalMin(value = "0", inclusive = false) BigDecimal weightKg
    ) {}

    public record ImageRequest(
        @NotBlank String imageUrl,
        String altText,
        Boolean primary,
        @Min(0) Integer sortOrder,
        String variantSku
    ) {}

    public record CustomsRequest(
        String chineseName,
        String englishName,
        String hsCode,
        @DecimalMin("0.00") BigDecimal invoiceAmount,
        @Pattern(regexp = "[A-Z]{3}") String invoiceCurrency,
        @DecimalMin(value = "0", inclusive = false) BigDecimal grossWeightKg
    ) {}

    public record CostRequest(
        String sourceUrl,
        @Min(0) Integer purchaseDurationDays,
        @DecimalMin("0.00") BigDecimal salesTaxAmount,
        @Pattern(regexp = "[A-Z]{3}") String taxCurrency
    ) {}

    public record ChannelListingRequest(
        @NotNull Long channelId,
        @NotNull ChannelSellingStatus sellingStatus,
        String externalProductId
    ) {}

    public record Summary(
        Long id,
        String masterName,
        String name,
        String upc,
        String spu,
        Long categoryId,
        String categoryName,
        Long brandId,
        String brandName,
        String sku,
        BigDecimal price,
        boolean active,
        int variantCount,
        int quantity,
        int reserved,
        int available
    ) {}

    public record OptionValueView(Long id, String value, int sortOrder, boolean active) {}
    public record OptionTypeView(Long id, String name, int sortOrder, boolean active, List<OptionValueView> values) {}
    public record PackagingView(BigDecimal lengthCm, BigDecimal widthCm, BigDecimal heightCm, BigDecimal weightKg) {}
    public record VariantView(
        Long id,
        String sku,
        String barcode,
        String variantName,
        BigDecimal sellingPrice,
        boolean defaultVariant,
        boolean active,
        Map<String, String> options,
        PackagingView packaging,
        int quantity,
        int reserved,
        int available
    ) {}
    public record ImageView(Long id, String imageUrl, String altText, boolean primary, int sortOrder, Long variantId) {}
    public record CustomsView(String chineseName, String englishName, String hsCode, BigDecimal invoiceAmount, String invoiceCurrency, BigDecimal grossWeightKg) {}
    public record CostView(String sourceUrl, Integer purchaseDurationDays, BigDecimal salesTaxAmount, String taxCurrency) {}
    public record ChannelListingView(Long id, Long channelId, String channelCode, String channelName, ChannelSellingStatus sellingStatus, String externalProductId) {}

    public record Detail(
        Long id,
        String masterName,
        String name,
        String upc,
        String spu,
        String sku,
        BigDecimal price,
        int quantity,
        int reserved,
        int available,
        Long categoryId,
        String categoryName,
        Long brandId,
        String brandName,
        ProductCondition condition,
        Integer shelfLifeDays,
        int minimumPurchaseQuantity,
        String shortDescription,
        String longDescription,
        boolean hasVariations,
        boolean preorder,
        String remarks1,
        String remarks2,
        String remarks3,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<OptionTypeView> optionTypes,
        List<VariantView> variants,
        List<ImageView> images,
        CustomsView customs,
        CostView cost,
        List<ChannelListingView> channelListings
    ) {}
}
