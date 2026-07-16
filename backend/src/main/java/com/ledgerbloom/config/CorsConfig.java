package com.ledgerbloom.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * allowCredentials(true) is required so the browser sends/receives the session cookie
 * and the CSRF cookie on cross-port requests from the Vite dev server. Browsers reject
 * allowCredentials(true) combined with a wildcard origin or wildcard headers, so the
 * origin list stays explicit (from {@code ledgerbloom.cors.allowed-origins}) and headers
 * are enumerated (including X-XSRF-TOKEN, which the SPA echoes back from the readable
 * CSRF cookie).
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

	private final String[] allowedOrigins;

	public CorsConfig(
			@Value("${ledgerbloom.cors.allowed-origins:http://localhost:5173}") String allowedOrigins) {
		this.allowedOrigins = allowedOrigins.split("\\s*,\\s*");
	}

	@Override
	public void addCorsMappings(CorsRegistry registry) {
		registry.addMapping("/api/**")
			.allowedOrigins(allowedOrigins)
			.allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
			.allowedHeaders("Content-Type", "X-XSRF-TOKEN", "X-Requested-With", "Accept")
			.exposedHeaders("Content-Disposition")
			.allowCredentials(true);
	}
}
