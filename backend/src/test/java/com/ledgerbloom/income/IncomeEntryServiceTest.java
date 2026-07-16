package com.ledgerbloom.income;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ledgerbloom.auth.CurrentUser;
import com.ledgerbloom.user.User;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class IncomeEntryServiceTest {

	private static final Long USER_ID = 1L;

	@Mock
	private IncomeEntryRepository incomeEntryRepository;

	@Mock
	private CurrentUser currentUser;

	@InjectMocks
	private IncomeEntryService incomeEntryService;

	private User user;

	@BeforeEach
	void setUp() throws Exception {
		user = new User("user@example.com", "hash", "Test User");
		setUserId(user, USER_ID);
		lenient().when(currentUser.requireUserId()).thenReturn(USER_ID);
		lenient().when(currentUser.requireUserReference()).thenReturn(user);
	}

	@Test
	void createValidIncomeEntry() throws Exception {
		when(incomeEntryRepository.saveAndFlush(any(IncomeEntry.class))).thenAnswer(invocation -> {
			IncomeEntry entry = invocation.getArgument(0);
			setId(entry, 10L);
			onCreate(entry);
			return entry;
		});

		IncomeEntryResponse response = incomeEntryService.create(new IncomeEntryCreateRequest(
			"Freelance payment",
			"Acme Corp",
			new BigDecimal("500.00"),
			LocalDate.of(2026, 7, 10),
			"Invoice #42"
		));

		assertThat(response.id()).isEqualTo(10L);
		assertThat(response.description()).isEqualTo("Freelance payment");
		assertThat(response.source()).isEqualTo("Acme Corp");
		assertThat(response.amount()).isEqualByComparingTo("500.00");
		assertThat(response.incomeDate()).isEqualTo(LocalDate.of(2026, 7, 10));
		assertThat(response.notes()).isEqualTo("Invoice #42");
	}

	@Test
	void createTrimsDescription() throws Exception {
		when(incomeEntryRepository.saveAndFlush(any(IncomeEntry.class))).thenAnswer(invocation -> {
			IncomeEntry entry = invocation.getArgument(0);
			setId(entry, 11L);
			onCreate(entry);
			return entry;
		});

		incomeEntryService.create(new IncomeEntryCreateRequest(
			"  Freelance payment  ",
			"Acme Corp",
			new BigDecimal("10.00"),
			LocalDate.of(2026, 7, 1),
			null
		));

		ArgumentCaptor<IncomeEntry> captor = ArgumentCaptor.forClass(IncomeEntry.class);
		verify(incomeEntryRepository).saveAndFlush(captor.capture());
		assertThat(captor.getValue().getDescription()).isEqualTo("Freelance payment");
	}

	@Test
	void createTrimsSource() throws Exception {
		when(incomeEntryRepository.saveAndFlush(any(IncomeEntry.class))).thenAnswer(invocation -> {
			IncomeEntry entry = invocation.getArgument(0);
			setId(entry, 12L);
			onCreate(entry);
			return entry;
		});

		incomeEntryService.create(new IncomeEntryCreateRequest(
			"Freelance payment",
			"  Acme Corp  ",
			new BigDecimal("10.00"),
			LocalDate.of(2026, 7, 1),
			null
		));

		ArgumentCaptor<IncomeEntry> captor = ArgumentCaptor.forClass(IncomeEntry.class);
		verify(incomeEntryRepository).saveAndFlush(captor.capture());
		assertThat(captor.getValue().getSource()).isEqualTo("Acme Corp");
	}

	@Test
	void createConvertsBlankNotesToNull() throws Exception {
		when(incomeEntryRepository.saveAndFlush(any(IncomeEntry.class))).thenAnswer(invocation -> {
			IncomeEntry entry = invocation.getArgument(0);
			setId(entry, 13L);
			onCreate(entry);
			return entry;
		});

		IncomeEntryResponse response = incomeEntryService.create(new IncomeEntryCreateRequest(
			"Freelance payment",
			"Acme Corp",
			new BigDecimal("10.00"),
			LocalDate.of(2026, 7, 1),
			"  "
		));

		assertThat(response.notes()).isNull();
	}

	@Test
	void createRejectsBlankNormalizedDescription() {
		assertThatThrownBy(() -> incomeEntryService.create(new IncomeEntryCreateRequest(
			"   ",
			"Acme Corp",
			new BigDecimal("10.00"),
			LocalDate.of(2026, 7, 1),
			null
		))).isInstanceOf(InvalidIncomeDataException.class);

		verify(incomeEntryRepository, never()).saveAndFlush(any());
	}

	@Test
	void createRejectsBlankNormalizedSource() {
		assertThatThrownBy(() -> incomeEntryService.create(new IncomeEntryCreateRequest(
			"Freelance payment",
			"   ",
			new BigDecimal("10.00"),
			LocalDate.of(2026, 7, 1),
			null
		))).isInstanceOf(InvalidIncomeDataException.class);

		verify(incomeEntryRepository, never()).saveAndFlush(any());
	}

	@Test
	void createRejectsZeroAmount() {
		assertThatThrownBy(() -> incomeEntryService.create(new IncomeEntryCreateRequest(
			"Freelance payment",
			"Acme Corp",
			BigDecimal.ZERO,
			LocalDate.of(2026, 7, 1),
			null
		))).isInstanceOf(InvalidIncomeDataException.class);

		verify(incomeEntryRepository, never()).saveAndFlush(any());
	}

	@Test
	void createRejectsNegativeAmount() {
		assertThatThrownBy(() -> incomeEntryService.create(new IncomeEntryCreateRequest(
			"Freelance payment",
			"Acme Corp",
			new BigDecimal("-5.00"),
			LocalDate.of(2026, 7, 1),
			null
		))).isInstanceOf(InvalidIncomeDataException.class);

		verify(incomeEntryRepository, never()).saveAndFlush(any());
	}

	@Test
	void createRejectsAmountWithMoreThanTwoDecimals() {
		assertThatThrownBy(() -> incomeEntryService.create(new IncomeEntryCreateRequest(
			"Freelance payment",
			"Acme Corp",
			new BigDecimal("1.234"),
			LocalDate.of(2026, 7, 1),
			null
		))).isInstanceOf(InvalidIncomeDataException.class);
	}

	@Test
	void createRejectsAmountExceedingNumericLimit() {
		assertThatThrownBy(() -> incomeEntryService.create(new IncomeEntryCreateRequest(
			"Freelance payment",
			"Acme Corp",
			new BigDecimal("9999999999.99").add(new BigDecimal("0.01")),
			LocalDate.of(2026, 7, 1),
			null
		))).isInstanceOf(InvalidIncomeDataException.class);
	}

	@Test
	void getIncomeEntryById() throws Exception {
		IncomeEntry entry = sampleEntry(5L, LocalDate.of(2026, 7, 5));
		when(incomeEntryRepository.findByIdAndUser_Id(5L, USER_ID)).thenReturn(Optional.of(entry));

		IncomeEntryResponse response = incomeEntryService.findById(5L);

		assertThat(response.id()).isEqualTo(5L);
		assertThat(response.source()).isEqualTo("Acme Corp");
	}

	@Test
	void getMissingIncomeEntryThrows() {
		when(incomeEntryRepository.findByIdAndUser_Id(99L, USER_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> incomeEntryService.findById(99L))
			.isInstanceOf(IncomeEntryNotFoundException.class);
	}

	@Test
	void updateValidIncomeEntry() throws Exception {
		IncomeEntry entry = sampleEntry(5L, LocalDate.of(2026, 7, 5));
		when(incomeEntryRepository.findByIdAndUser_Id(5L, USER_ID)).thenReturn(Optional.of(entry));
		when(incomeEntryRepository.saveAndFlush(any(IncomeEntry.class))).thenAnswer(invocation -> invocation.getArgument(0));

		IncomeEntryResponse response = incomeEntryService.update(5L, new IncomeEntryUpdateRequest(
			"Updated",
			"New Source",
			new BigDecimal("12.00"),
			LocalDate.of(2026, 7, 6),
			"changed"
		));

		assertThat(response.description()).isEqualTo("Updated");
		assertThat(response.source()).isEqualTo("New Source");
		assertThat(response.amount()).isEqualByComparingTo("12.00");
	}

	@Test
	void deleteExistingIncomeEntry() throws Exception {
		IncomeEntry entry = sampleEntry(5L, LocalDate.of(2026, 7, 5));
		when(incomeEntryRepository.findByIdAndUser_Id(5L, USER_ID)).thenReturn(Optional.of(entry));

		incomeEntryService.delete(5L);

		verify(incomeEntryRepository).delete(entry);
	}

	@Test
	void deleteMissingIncomeEntryThrows() {
		when(incomeEntryRepository.findByIdAndUser_Id(99L, USER_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> incomeEntryService.delete(99L))
			.isInstanceOf(IncomeEntryNotFoundException.class);
	}

	@Test
	void listAllUsesRepositoryOrder() throws Exception {
		IncomeEntry newer = sampleEntry(2L, LocalDate.of(2026, 7, 10));
		IncomeEntry older = sampleEntry(1L, LocalDate.of(2026, 6, 1));
		when(incomeEntryRepository.findByUser_IdOrderByIncomeDateDescIdDesc(USER_ID)).thenReturn(List.of(newer, older));

		List<IncomeEntryResponse> response = incomeEntryService.findAll(null, null, null);

		assertThat(response).extracting(IncomeEntryResponse::id).containsExactly(2L, 1L);
		verify(incomeEntryRepository).findByUser_IdOrderByIncomeDateDescIdDesc(USER_ID);
	}

	@Test
	void filterByMonth() throws Exception {
		when(incomeEntryRepository
			.findByUser_IdAndIncomeDateGreaterThanEqualAndIncomeDateLessThanOrderByIncomeDateDescIdDesc(
				USER_ID,
				LocalDate.of(2026, 7, 1),
				LocalDate.of(2026, 8, 1)
			)).thenReturn(List.of(sampleEntry(1L, LocalDate.of(2026, 7, 15))));

		List<IncomeEntryResponse> response = incomeEntryService.findAll(2026, 7, null);

		assertThat(response).hasSize(1);
	}

	@Test
	void filterBySource() throws Exception {
		when(incomeEntryRepository.findByUser_IdAndSourceIgnoreCaseOrderByIncomeDateDescIdDesc(USER_ID, "Acme Corp"))
			.thenReturn(List.of(sampleEntry(1L, LocalDate.of(2026, 7, 15))));

		List<IncomeEntryResponse> response = incomeEntryService.findAll(null, null, "Acme Corp");

		assertThat(response).hasSize(1);
		verify(incomeEntryRepository).findByUser_IdAndSourceIgnoreCaseOrderByIncomeDateDescIdDesc(USER_ID, "Acme Corp");
	}

	@Test
	void filterBySourceIsCaseInsensitive() throws Exception {
		when(incomeEntryRepository.findByUser_IdAndSourceIgnoreCaseOrderByIncomeDateDescIdDesc(USER_ID, "acme corp"))
			.thenReturn(List.of(sampleEntry(1L, LocalDate.of(2026, 7, 15))));

		List<IncomeEntryResponse> response = incomeEntryService.findAll(null, null, "acme corp");

		assertThat(response).hasSize(1);
		verify(incomeEntryRepository).findByUser_IdAndSourceIgnoreCaseOrderByIncomeDateDescIdDesc(USER_ID, "acme corp");
	}

	@Test
	void filterByMonthAndSource() throws Exception {
		when(incomeEntryRepository
			.findByUser_IdAndSourceIgnoreCaseAndIncomeDateGreaterThanEqualAndIncomeDateLessThanOrderByIncomeDateDescIdDesc(
				USER_ID,
				"Acme Corp",
				LocalDate.of(2026, 7, 1),
				LocalDate.of(2026, 8, 1)
			)).thenReturn(List.of());

		List<IncomeEntryResponse> response = incomeEntryService.findAll(2026, 7, "Acme Corp");

		assertThat(response).isEmpty();
	}

	@Test
	void rejectYearWithoutMonth() {
		assertThatThrownBy(() -> incomeEntryService.findAll(2026, null, null))
			.isInstanceOf(InvalidIncomeFilterException.class);
	}

	@Test
	void rejectMonthWithoutYear() {
		assertThatThrownBy(() -> incomeEntryService.findAll(null, 7, null))
			.isInstanceOf(InvalidIncomeFilterException.class);
	}

	@Test
	void rejectInvalidMonth() {
		assertThatThrownBy(() -> incomeEntryService.findAll(2026, 13, null))
			.isInstanceOf(InvalidIncomeFilterException.class);
	}

	@Test
	void blankSourceFilterIsTreatedAsAbsent() throws Exception {
		when(incomeEntryRepository.findByUser_IdOrderByIncomeDateDescIdDesc(USER_ID))
			.thenReturn(List.of(sampleEntry(1L, LocalDate.of(2026, 7, 15))));

		List<IncomeEntryResponse> response = incomeEntryService.findAll(null, null, "   ");

		assertThat(response).hasSize(1);
		verify(incomeEntryRepository).findByUser_IdOrderByIncomeDateDescIdDesc(USER_ID);
		verify(incomeEntryRepository, never()).findByUser_IdAndSourceIgnoreCaseOrderByIncomeDateDescIdDesc(any(), any());
	}

	private IncomeEntry sampleEntry(Long id, LocalDate date) throws Exception {
		IncomeEntry entry = new IncomeEntry(
			user,
			"Sample",
			"Acme Corp",
			new BigDecimal("10.00"),
			date,
			null
		);
		setId(entry, id);
		setTimestamps(entry, Instant.parse("2026-01-01T00:00:00Z"), Instant.parse("2026-01-01T00:00:00Z"));
		return entry;
	}

	private static void setId(IncomeEntry entry, Long id) throws Exception {
		Field field = IncomeEntry.class.getDeclaredField("id");
		field.setAccessible(true);
		field.set(entry, id);
	}

	private static void setUserId(User user, Long id) throws Exception {
		Field field = User.class.getDeclaredField("id");
		field.setAccessible(true);
		field.set(user, id);
	}

	private static void onCreate(IncomeEntry entry) throws Exception {
		java.lang.reflect.Method method = IncomeEntry.class.getDeclaredMethod("onCreate");
		method.setAccessible(true);
		method.invoke(entry);
	}

	private static void setTimestamps(IncomeEntry entry, Instant createdAt, Instant updatedAt) throws Exception {
		Field created = IncomeEntry.class.getDeclaredField("createdAt");
		created.setAccessible(true);
		created.set(entry, createdAt);
		Field updated = IncomeEntry.class.getDeclaredField("updatedAt");
		updated.setAccessible(true);
		updated.set(entry, updatedAt);
	}
}
