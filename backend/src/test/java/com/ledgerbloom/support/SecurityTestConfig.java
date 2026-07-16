package com.ledgerbloom.support;

import com.ledgerbloom.auth.RestAccessDeniedHandler;
import com.ledgerbloom.auth.RestAuthenticationEntryPoint;
import com.ledgerbloom.auth.SecurityConfig;
import org.springframework.context.annotation.Import;

/**
 * Single import target that wires the production {@link SecurityConfig} filter chain
 * (plus its @Component exception handlers, which slice tests don't scan automatically)
 * into @WebMvcTest classes so those tests exercise the real authorization + CSRF rules
 * instead of relying on Spring Boot's default security auto-configuration.
 */
@Import({SecurityConfig.class, RestAuthenticationEntryPoint.class, RestAccessDeniedHandler.class})
public class SecurityTestConfig {
}
