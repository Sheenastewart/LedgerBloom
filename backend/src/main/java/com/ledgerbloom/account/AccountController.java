package com.ledgerbloom.account;

import com.ledgerbloom.auth.CurrentUser;
import com.ledgerbloom.auth.UserResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/account")
public class AccountController {

	private final AccountService accountService;
	private final CurrentUser currentUser;

	public AccountController(AccountService accountService, CurrentUser currentUser) {
		this.accountService = accountService;
		this.currentUser = currentUser;
	}

	@GetMapping
	public UserResponse getAccount() {
		return accountService.getProfile(currentUser.requireUserId());
	}

	@PutMapping("/profile")
	public UserResponse updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
		return accountService.updateProfile(currentUser.requireUserId(), request);
	}

	@PutMapping("/password")
	public UserResponse changePassword(
			@Valid @RequestBody ChangePasswordRequest request,
			HttpServletRequest httpRequest,
			HttpServletResponse httpResponse) {
		return accountService.changePassword(
			currentUser.requireUserId(),
			request,
			httpRequest,
			httpResponse
		);
	}
}
