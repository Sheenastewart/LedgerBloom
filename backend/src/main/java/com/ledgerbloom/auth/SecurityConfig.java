package com.ledgerbloom.auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.FormLoginConfigurer;
import org.springframework.security.config.annotation.web.configurers.HttpBasicConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;

/**
 * Session-cookie authentication (JSESSIONID-style, but named LEDGERBLOOM_SESSION) with
 * Spring Security + BCrypt, chosen over JWT because:
 * - No extra JWT library, signing key rotation, or client-side token storage to manage.
 * - The SPA and API share effectively the same site during local development
 *   (localhost:5173 / localhost:8080), so a SameSite=Lax cookie sent with
 *   credentials: 'include' works cleanly and lets the server revoke sessions instantly.
 * - Spring Security's session + CSRF cookie support is first-class and well-tested,
 *   whereas a hand-rolled JWT flow would re-implement a lot of the same guarantees.
 *
 * CSRF uses the built-in Spring Security 7 / Boot 4 "spa()" convenience, which is the
 * modern equivalent of wiring CookieCsrfTokenRepository.withHttpOnlyFalse() +
 * SpaCsrfTokenRequestHandler by hand: the token is readable by JavaScript via the
 * XSRF-TOKEN cookie and the SPA echoes it back as the X-XSRF-TOKEN request header.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	@Bean
	public SecurityContextRepository securityContextRepository() {
		return new HttpSessionSecurityContextRepository();
	}

	@Bean
	public SecurityFilterChain securityFilterChain(
			HttpSecurity http,
			SecurityContextRepository securityContextRepository,
			RestAuthenticationEntryPoint authenticationEntryPoint,
			RestAccessDeniedHandler accessDeniedHandler) throws Exception {
		http
			.securityContext(context -> context.securityContextRepository(securityContextRepository))
			.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
			.csrf(csrf -> csrf
				.spa()
				// Login/register are anonymous and must work before the SPA has an XSRF cookie.
				// Session fixation is mitigated by creating a fresh authenticated session on login.
				.ignoringRequestMatchers("/api/auth/login", "/api/auth/register"))
			.authorizeHttpRequests(authorize -> authorize
				.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
				.requestMatchers(HttpMethod.GET, "/api/health").permitAll()
				.requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login").permitAll()
				.requestMatchers("/api/**").authenticated()
				.anyRequest().authenticated())
			.exceptionHandling(handling -> handling
				.authenticationEntryPoint(authenticationEntryPoint)
				.accessDeniedHandler(accessDeniedHandler))
			.formLogin(FormLoginConfigurer::disable)
			.httpBasic(HttpBasicConfigurer::disable)
			.logout(logout -> logout
				.logoutUrl("/api/auth/logout")
				.logoutSuccessHandler((request, response, authentication) -> response.setStatus(HttpStatus.NO_CONTENT.value()))
				.deleteCookies("LEDGERBLOOM_SESSION", "XSRF-TOKEN")
				.invalidateHttpSession(true)
				.clearAuthentication(true));
		return http.build();
	}
}
