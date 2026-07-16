package com.ledgerbloom.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ledgerbloom.category.CategoryService;
import com.ledgerbloom.category.StarterCategoriesResponse;
import com.ledgerbloom.category.StarterCategoryNames;
import com.ledgerbloom.user.User;
import com.ledgerbloom.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

	@Mock
	private UserRepository userRepository;

	@Mock
	private CategoryService categoryService;

	@Mock
	private SecurityContextRepository securityContextRepository;

	@Mock
	private HttpServletRequest httpRequest;

	@Mock
	private HttpServletResponse httpResponse;

	private PasswordEncoder passwordEncoder;

	private AuthService authService;

	@BeforeEach
	void setUp() {
		// Real BCryptPasswordEncoder (not mocked) so hash-format assertions below are meaningful.
		passwordEncoder = new BCryptPasswordEncoder();
		authService = new AuthService(userRepository, categoryService, passwordEncoder, securityContextRepository);
		org.mockito.Mockito.lenient()
			.when(categoryService.createStarterSetForUser(any(User.class)))
			.thenReturn(new StarterCategoriesResponse(22, StarterCategoryNames.ALL, 0, List.of()));
	}

	@Test
	void registerCreatesStarterCategoriesForNewUser() {
		when(userRepository.existsByEmailIgnoreCase("user@example.com")).thenReturn(false);
		when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
			User user = invocation.getArgument(0);
			setId(user, 1L);
			onCreate(user);
			return user;
		});
		when(categoryService.createStarterSetForUser(any(User.class)))
			.thenReturn(new StarterCategoriesResponse(22, List.of("Housing"), 0, List.of()));

		authService.register(new RegisterRequest("user@example.com", "supersecret", "supersecret", "Jane Doe"));

		ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
		verify(categoryService).createStarterSetForUser(captor.capture());
		assertThat(captor.getValue().getId()).isEqualTo(1L);
	}

	@Test
	void registerPropagatesStarterCategoryFailureWithoutReturningUser() {
		when(userRepository.existsByEmailIgnoreCase("user@example.com")).thenReturn(false);
		when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
			User user = invocation.getArgument(0);
			setId(user, 1L);
			onCreate(user);
			return user;
		});
		doThrow(new RuntimeException("category seed failed"))
			.when(categoryService).createStarterSetForUser(any(User.class));

		assertThatThrownBy(() -> authService.register(
			new RegisterRequest("user@example.com", "supersecret", "supersecret", "Jane Doe")
		)).isInstanceOf(RuntimeException.class)
			.hasMessage("category seed failed");
	}

	@Test
	void loginDoesNotRecreateStarterCategories() throws Exception {
		User user = sampleUser(1L, "user@example.com", "supersecret");
		when(userRepository.findByEmailIgnoreCase("user@example.com")).thenReturn(Optional.of(user));
		when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

		authService.login(new LoginRequest("user@example.com", "supersecret"), httpRequest, httpResponse);

		verify(categoryService, never()).createStarterSetForUser(any());
		verify(categoryService, never()).addStarterSet();
	}

	@Test
	void registerStoresBcryptHashAndNeverReturnsPassword() {
		when(userRepository.existsByEmailIgnoreCase("user@example.com")).thenReturn(false);
		when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
			User user = invocation.getArgument(0);
			setId(user, 1L);
			onCreate(user);
			return user;
		});

		UserResponse response = authService.register(
			new RegisterRequest("user@example.com", "supersecret", "supersecret", "Jane Doe")
		);

		assertThat(response.id()).isEqualTo(1L);
		assertThat(response.email()).isEqualTo("user@example.com");
		assertThat(response.displayName()).isEqualTo("Jane Doe");
		assertThat(response.createdAt()).isNotNull();

		ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
		verify(userRepository).saveAndFlush(captor.capture());
		String storedHash = captor.getValue().getPasswordHash();
		assertThat(storedHash).matches("^\\$2[aby]\\$.*");
		assertThat(storedHash).isNotEqualTo("supersecret");
		assertThat(passwordEncoder.matches("supersecret", storedHash)).isTrue();
	}

	@Test
	void registerNormalizesEmailToLowercaseAndTrimsDisplayName() {
		when(userRepository.existsByEmailIgnoreCase("user@example.com")).thenReturn(false);
		when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

		authService.register(new RegisterRequest("  User@Example.com  ", "supersecret", "supersecret", "  Jane Doe  "));

		ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
		verify(userRepository).saveAndFlush(captor.capture());
		assertThat(captor.getValue().getEmail()).isEqualTo("user@example.com");
		assertThat(captor.getValue().getDisplayName()).isEqualTo("Jane Doe");
	}

	@Test
	void registerRejectsMismatchedPasswords() {
		assertThatThrownBy(() -> authService.register(
			new RegisterRequest("user@example.com", "supersecret", "different", "Jane Doe")
		)).isInstanceOf(InvalidRegistrationDataException.class);

		verify(userRepository, never()).saveAndFlush(any());
	}

	@Test
	void registerRejectsDuplicateEmail() {
		when(userRepository.existsByEmailIgnoreCase("user@example.com")).thenReturn(true);

		assertThatThrownBy(() -> authService.register(
			new RegisterRequest("user@example.com", "supersecret", "supersecret", "Jane Doe")
		)).isInstanceOf(EmailAlreadyExistsException.class);

		verify(userRepository, never()).saveAndFlush(any());
	}

	@Test
	void registerMapsIntegrityViolationRaceToEmailAlreadyExists() {
		when(userRepository.existsByEmailIgnoreCase("user@example.com")).thenReturn(false);
		when(userRepository.saveAndFlush(any(User.class)))
			.thenThrow(new DataIntegrityViolationException("unique constraint"));

		assertThatThrownBy(() -> authService.register(
			new RegisterRequest("user@example.com", "supersecret", "supersecret", "Jane Doe")
		)).isInstanceOf(EmailAlreadyExistsException.class);
	}

	@Test
	void loginValidCredentialsReturnsResponseAndUpdatesLastLogin() throws Exception {
		User user = sampleUser(1L, "user@example.com", "supersecret");
		when(userRepository.findByEmailIgnoreCase("user@example.com")).thenReturn(Optional.of(user));
		when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

		UserResponse response = authService.login(
			new LoginRequest("user@example.com", "supersecret"),
			httpRequest,
			httpResponse
		);

		assertThat(response.id()).isEqualTo(1L);
		assertThat(response.email()).isEqualTo("user@example.com");

		ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
		verify(userRepository).saveAndFlush(captor.capture());
		assertThat(captor.getValue().getLastLoginAt()).isNotNull();
		verify(securityContextRepository).saveContext(any(), any(), any());
	}

	@Test
	void loginWrongPasswordThrowsInvalidCredentials() throws Exception {
		User user = sampleUser(1L, "user@example.com", "supersecret");
		when(userRepository.findByEmailIgnoreCase("user@example.com")).thenReturn(Optional.of(user));

		assertThatThrownBy(() -> authService.login(
			new LoginRequest("user@example.com", "wrongpassword"),
			httpRequest,
			httpResponse
		)).isInstanceOf(InvalidCredentialsException.class);

		verify(userRepository, never()).saveAndFlush(any());
	}

	@Test
	void loginUnknownEmailThrowsInvalidCredentials() {
		when(userRepository.findByEmailIgnoreCase("missing@example.com")).thenReturn(Optional.empty());

		assertThatThrownBy(() -> authService.login(
			new LoginRequest("missing@example.com", "whatever"),
			httpRequest,
			httpResponse
		)).isInstanceOf(InvalidCredentialsException.class);
	}

	@Test
	void currentUserReturnsResponseForExistingId() throws Exception {
		User user = sampleUser(1L, "user@example.com", "supersecret");
		when(userRepository.findById(1L)).thenReturn(Optional.of(user));

		UserResponse response = authService.currentUser(1L);

		assertThat(response.id()).isEqualTo(1L);
		assertThat(response.email()).isEqualTo("user@example.com");
	}

	@Test
	void currentUserThrowsWhenMissing() {
		when(userRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> authService.currentUser(99L))
			.isInstanceOf(AuthenticationRequiredException.class);
	}

	private User sampleUser(Long id, String email, String rawPassword) throws Exception {
		User user = new User(email, passwordEncoder.encode(rawPassword), "Jane Doe");
		setId(user, id);
		onCreate(user);
		return user;
	}

	private static void setId(User user, Long id) throws Exception {
		Field field = User.class.getDeclaredField("id");
		field.setAccessible(true);
		field.set(user, id);
	}

	private static void onCreate(User user) throws Exception {
		java.lang.reflect.Method method = User.class.getDeclaredMethod("onCreate");
		method.setAccessible(true);
		method.invoke(user);
	}
}
