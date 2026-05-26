package biz.michael_maldo.merkado.shared.aspect;

import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Aspect
@Component
public class LoggingAspect {

    private static final Logger logger =
            LoggerFactory.getLogger(LoggingAspect.class);

    /**
     * Sensitive keywords that should NEVER appear in logs
     */
    private static final List<String> SENSITIVE_KEYWORDS = List.of(
            "password",
            "token",
            "authorization",
            "secret",
            "apikey",
            "accessToken",
            "refreshToken"
    );

    /**
     * ONLY intercept application services/controllers
     */
    @Pointcut(
            "within(@org.springframework.stereotype.Service *) || " +
                    "within(@org.springframework.web.bind.annotation.RestController *)"
    )
    public void applicationPackagePointcut() {
    }

    /**
     * BEFORE METHOD EXECUTION
     */
    @Before("applicationPackagePointcut()")
    public void logBefore(JoinPoint joinPoint) {

        String className =
                joinPoint.getTarget()
                        .getClass()
                        .getSimpleName();

        String methodName =
                joinPoint.getSignature()
                        .getName();

        logger.info(
                "[{}.{}] START args={}",
                className,
                methodName,
                sanitizeArgs(joinPoint.getArgs())
        );
    }

    /**
     * AFTER SUCCESSFUL RETURN
     */
    @AfterReturning(
            pointcut = "applicationPackagePointcut()",
            returning = "result"
    )
    public void logAfterReturning(
            JoinPoint joinPoint,
            Object result
    ) {

        String className =
                joinPoint.getTarget()
                        .getClass()
                        .getSimpleName();

        String methodName =
                joinPoint.getSignature()
                        .getName();

        /*
         * Skip logging auth/token responses completely
         */
        if (isSensitiveClass(className)) {

            logger.info(
                    "[{}.{}] SUCCESS return=[PROTECTED]",
                    className,
                    methodName
            );

            return;
        }

        logger.info(
                "[{}.{}] SUCCESS return={}",
                className,
                methodName,
                sanitizeObject(result)
        );
    }

    /**
     * AFTER EXCEPTION
     */
    @AfterThrowing(
            pointcut = "applicationPackagePointcut()",
            throwing = "ex"
    )
    public void logAfterThrowing(
            JoinPoint joinPoint,
            Exception ex
    ) {

        String className =
                joinPoint.getTarget()
                        .getClass()
                        .getSimpleName();

        String methodName =
                joinPoint.getSignature()
                        .getName();

        logger.error(
                "[{}.{}] ERROR message={}",
                className,
                methodName,
                ex.getMessage(),
                ex
        );
    }

    /**
     * EXECUTION TIME TRACKING
     */
    @Around("applicationPackagePointcut()")
    public Object logExecutionTime(
            ProceedingJoinPoint joinPoint
    ) throws Throwable {

        String className =
                joinPoint.getTarget()
                        .getClass()
                        .getSimpleName();

        String methodName =
                joinPoint.getSignature()
                        .getName();

        long startTime = System.currentTimeMillis();

        try {

            Object result = joinPoint.proceed();

            long executionTime =
                    System.currentTimeMillis() - startTime;

            logger.info(
                    "[{}.{}] COMPLETED executionTime={}ms",
                    className,
                    methodName,
                    executionTime
            );

            return result;

        } catch (Throwable ex) {

            long executionTime =
                    System.currentTimeMillis() - startTime;

            logger.error(
                    "[{}.{}] FAILED executionTime={}ms",
                    className,
                    methodName,
                    executionTime
            );

            throw ex;
        }
    }

    /**
     * SANITIZE ARGUMENTS
     */
    private Object sanitizeArgs(Object[] args) {

        return Arrays.stream(args)
                .map(this::sanitizeObject)
                .toList();
    }

    /**
     * SANITIZE OBJECT OUTPUT
     */
    private Object sanitizeObject(Object obj) {

        if (obj == null) {
            return null;
        }

        /*
         * Hide Spring Security Authentication objects completely
         */
        if (obj instanceof org.springframework.security.core.Authentication) {
            return "[AUTHENTICATION_PROTECTED]";
        }

        String value = obj.toString();

        /*
         * Detect raw JWT tokens
         *
         * JWT format:
         * xxxxx.yyyyy.zzzzz
         */
        if (value.matches("^[A-Za-z0-9-_]+=*\\.[A-Za-z0-9-_]+=*\\.[A-Za-z0-9-_+=/]*$")) {
            return "[JWT_REDACTED]";
        }

        /*
         * Detect Bearer tokens
         */
        value = value.replaceAll(
                "(?i)Bearer\\s+[A-Za-z0-9\\-_=]+\\.[A-Za-z0-9\\-_=]+\\.[A-Za-z0-9\\-_=+/]*",
                "Bearer [REDACTED]"
        );

        /*
         * Fully redact sensitive fields
         */
        value = value.replaceAll(
                "(?i)password=([^,\\]\\)]+)",
                "password=[REDACTED]"
        );

        value = value.replaceAll(
                "(?i)token=([^,\\]\\)]+)",
                "token=[REDACTED]"
        );

        value = value.replaceAll(
                "(?i)authorization=([^,\\]\\)]+)",
                "authorization=[REDACTED]"
        );

        value = value.replaceAll(
                "(?i)credentials=([^,\\]\\)]+)",
                "credentials=[REDACTED]"
        );

        return value;

    }

    /**
     * Prevent logging of sensitive auth responses
     */
    private boolean isSensitiveClass(String className) {

        return className.toLowerCase().contains("auth")
                || className.toLowerCase().contains("jwt")
                || className.toLowerCase().contains("token");
    }
}