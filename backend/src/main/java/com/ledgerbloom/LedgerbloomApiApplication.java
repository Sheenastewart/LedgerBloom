package com.ledgerbloom;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class LedgerbloomApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(LedgerbloomApiApplication.class, args);
	}

}
