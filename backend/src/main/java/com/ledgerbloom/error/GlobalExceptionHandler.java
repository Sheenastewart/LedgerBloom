package com.ledgerbloom.error;

import com.ledgerbloom.auth.AuthenticationRequiredException;
import com.ledgerbloom.auth.EmailAlreadyExistsException;
import com.ledgerbloom.auth.InvalidCredentialsException;
import com.ledgerbloom.auth.InvalidRegistrationDataException;
import com.ledgerbloom.budget.CategoryBudgetAlreadyExistsException;
import com.ledgerbloom.budget.CategoryBudgetLimitNotFoundException;
import com.ledgerbloom.budget.InvalidBudgetDataException;
import com.ledgerbloom.budget.InvalidBudgetFilterException;
import com.ledgerbloom.budget.MonthlyBudgetAlreadyExistsException;
import com.ledgerbloom.budget.MonthlyBudgetNotFoundException;
import com.ledgerbloom.category.CategoryInUseException;
import com.ledgerbloom.category.CategoryNameAlreadyExistsException;
import com.ledgerbloom.category.CategoryNotFoundException;
import com.ledgerbloom.category.InvalidCategoryDataException;
import com.ledgerbloom.dashboard.InvalidDashboardFilterException;
import com.ledgerbloom.expense.ExpenseNotFoundException;
import com.ledgerbloom.expense.InvalidExpenseDataException;
import com.ledgerbloom.expense.InvalidExpenseFilterException;
import com.ledgerbloom.income.IncomeEntryNotFoundException;
import com.ledgerbloom.income.IncomeEntryNotLinkedToRecurringIncomeException;
import com.ledgerbloom.income.InvalidIncomeDataException;
import com.ledgerbloom.income.InvalidIncomeFilterException;
import com.ledgerbloom.recurring.InvalidRecurringExpenseDataException;
import com.ledgerbloom.recurring.InvalidRecurringExpenseFilterException;
import com.ledgerbloom.recurring.RecurringExpenseNotFoundException;
import com.ledgerbloom.recurring.RecurringExpensePaymentConflictException;
import com.ledgerbloom.recurringincome.InvalidRecurringIncomeDataException;
import com.ledgerbloom.recurringincome.InvalidRecurringIncomeFilterException;
import com.ledgerbloom.recurringincome.RecurringIncomeNotFoundException;
import com.ledgerbloom.recurringincome.RecurringIncomeReceiptConflictException;
import com.ledgerbloom.report.ExportGenerationFailedException;
import com.ledgerbloom.report.InvalidReportPeriodException;
import com.ledgerbloom.report.ReportRangeTooLargeException;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(CategoryNotFoundException.class)
	public ResponseEntity<ApiErrorResponse> handleCategoryNotFound(
			CategoryNotFoundException ex,
			HttpServletRequest request) {
		return build(HttpStatus.NOT_FOUND, ErrorCode.CATEGORY_NOT_FOUND, ex.getMessage(), request.getRequestURI(), null);
	}

	@ExceptionHandler(ExpenseNotFoundException.class)
	public ResponseEntity<ApiErrorResponse> handleExpenseNotFound(
			ExpenseNotFoundException ex,
			HttpServletRequest request) {
		return build(HttpStatus.NOT_FOUND, ErrorCode.EXPENSE_NOT_FOUND, ex.getMessage(), request.getRequestURI(), null);
	}

	@ExceptionHandler(IncomeEntryNotFoundException.class)
	public ResponseEntity<ApiErrorResponse> handleIncomeEntryNotFound(
			IncomeEntryNotFoundException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.NOT_FOUND,
			ErrorCode.INCOME_ENTRY_NOT_FOUND,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(IncomeEntryNotLinkedToRecurringIncomeException.class)
	public ResponseEntity<ApiErrorResponse> handleIncomeEntryNotLinkedToRecurring(
			IncomeEntryNotLinkedToRecurringIncomeException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.NOT_FOUND,
			ErrorCode.INCOME_ENTRY_NOT_LINKED_TO_RECURRING,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(MonthlyBudgetNotFoundException.class)
	public ResponseEntity<ApiErrorResponse> handleMonthlyBudgetNotFound(
			MonthlyBudgetNotFoundException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.NOT_FOUND,
			ErrorCode.BUDGET_NOT_FOUND,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(CategoryBudgetLimitNotFoundException.class)
	public ResponseEntity<ApiErrorResponse> handleCategoryBudgetLimitNotFound(
			CategoryBudgetLimitNotFoundException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.NOT_FOUND,
			ErrorCode.CATEGORY_BUDGET_LIMIT_NOT_FOUND,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(RecurringExpenseNotFoundException.class)
	public ResponseEntity<ApiErrorResponse> handleRecurringExpenseNotFound(
			RecurringExpenseNotFoundException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.NOT_FOUND,
			ErrorCode.RECURRING_EXPENSE_NOT_FOUND,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(RecurringIncomeNotFoundException.class)
	public ResponseEntity<ApiErrorResponse> handleRecurringIncomeNotFound(
			RecurringIncomeNotFoundException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.NOT_FOUND,
			ErrorCode.RECURRING_INCOME_NOT_FOUND,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(CategoryNameAlreadyExistsException.class)
	public ResponseEntity<ApiErrorResponse> handleConflict(
			CategoryNameAlreadyExistsException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.CONFLICT,
			ErrorCode.CATEGORY_NAME_ALREADY_EXISTS,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(MonthlyBudgetAlreadyExistsException.class)
	public ResponseEntity<ApiErrorResponse> handleMonthlyBudgetAlreadyExists(
			MonthlyBudgetAlreadyExistsException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.CONFLICT,
			ErrorCode.BUDGET_ALREADY_EXISTS,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(CategoryBudgetAlreadyExistsException.class)
	public ResponseEntity<ApiErrorResponse> handleCategoryBudgetAlreadyExists(
			CategoryBudgetAlreadyExistsException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.CONFLICT,
			ErrorCode.CATEGORY_BUDGET_ALREADY_EXISTS,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(RecurringExpensePaymentConflictException.class)
	public ResponseEntity<ApiErrorResponse> handleRecurringExpensePaymentConflict(
			RecurringExpensePaymentConflictException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.CONFLICT,
			ErrorCode.RECURRING_EXPENSE_PAYMENT_CONFLICT,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(RecurringIncomeReceiptConflictException.class)
	public ResponseEntity<ApiErrorResponse> handleRecurringIncomeReceiptConflict(
			RecurringIncomeReceiptConflictException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.CONFLICT,
			ErrorCode.RECURRING_INCOME_RECEIPT_CONFLICT,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(CategoryInUseException.class)
	public ResponseEntity<ApiErrorResponse> handleCategoryInUse(
			CategoryInUseException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.CONFLICT,
			ErrorCode.CATEGORY_IN_USE,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(InvalidCategoryDataException.class)
	public ResponseEntity<ApiErrorResponse> handleInvalidCategoryData(
			InvalidCategoryDataException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.BAD_REQUEST,
			ErrorCode.VALIDATION_FAILED,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(InvalidExpenseDataException.class)
	public ResponseEntity<ApiErrorResponse> handleInvalidExpenseData(
			InvalidExpenseDataException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.BAD_REQUEST,
			ErrorCode.INVALID_EXPENSE_DATA,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(InvalidIncomeDataException.class)
	public ResponseEntity<ApiErrorResponse> handleInvalidIncomeData(
			InvalidIncomeDataException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.BAD_REQUEST,
			ErrorCode.INVALID_INCOME_DATA,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(InvalidBudgetDataException.class)
	public ResponseEntity<ApiErrorResponse> handleInvalidBudgetData(
			InvalidBudgetDataException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.BAD_REQUEST,
			ErrorCode.INVALID_BUDGET_DATA,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(InvalidRecurringExpenseDataException.class)
	public ResponseEntity<ApiErrorResponse> handleInvalidRecurringExpenseData(
			InvalidRecurringExpenseDataException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.BAD_REQUEST,
			ErrorCode.INVALID_RECURRING_EXPENSE_DATA,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(InvalidRecurringIncomeDataException.class)
	public ResponseEntity<ApiErrorResponse> handleInvalidRecurringIncomeData(
			InvalidRecurringIncomeDataException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.BAD_REQUEST,
			ErrorCode.INVALID_RECURRING_INCOME_DATA,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(InvalidExpenseFilterException.class)
	public ResponseEntity<ApiErrorResponse> handleInvalidExpenseFilter(
			InvalidExpenseFilterException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.BAD_REQUEST,
			ErrorCode.INVALID_REQUEST,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(InvalidIncomeFilterException.class)
	public ResponseEntity<ApiErrorResponse> handleInvalidIncomeFilter(
			InvalidIncomeFilterException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.BAD_REQUEST,
			ErrorCode.INVALID_REQUEST,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(InvalidDashboardFilterException.class)
	public ResponseEntity<ApiErrorResponse> handleInvalidDashboardFilter(
			InvalidDashboardFilterException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.BAD_REQUEST,
			ErrorCode.INVALID_REQUEST,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(InvalidBudgetFilterException.class)
	public ResponseEntity<ApiErrorResponse> handleInvalidBudgetFilter(
			InvalidBudgetFilterException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.BAD_REQUEST,
			ErrorCode.INVALID_REQUEST,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(InvalidReportPeriodException.class)
	public ResponseEntity<ApiErrorResponse> handleInvalidReportPeriod(
			InvalidReportPeriodException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.BAD_REQUEST,
			ErrorCode.INVALID_REPORT_PERIOD,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(ReportRangeTooLargeException.class)
	public ResponseEntity<ApiErrorResponse> handleReportRangeTooLarge(
			ReportRangeTooLargeException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.BAD_REQUEST,
			ErrorCode.REPORT_RANGE_TOO_LARGE,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(ExportGenerationFailedException.class)
	public ResponseEntity<ApiErrorResponse> handleExportGenerationFailed(
			ExportGenerationFailedException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.INTERNAL_SERVER_ERROR,
			ErrorCode.EXPORT_GENERATION_FAILED,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(InvalidRecurringExpenseFilterException.class)
	public ResponseEntity<ApiErrorResponse> handleInvalidRecurringExpenseFilter(
			InvalidRecurringExpenseFilterException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.BAD_REQUEST,
			ErrorCode.INVALID_RECURRING_EXPENSE_FILTER,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(InvalidRecurringIncomeFilterException.class)
	public ResponseEntity<ApiErrorResponse> handleInvalidRecurringIncomeFilter(
			InvalidRecurringIncomeFilterException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.BAD_REQUEST,
			ErrorCode.INVALID_RECURRING_INCOME_FILTER,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(EmailAlreadyExistsException.class)
	public ResponseEntity<ApiErrorResponse> handleEmailAlreadyExists(
			EmailAlreadyExistsException ex,
			HttpServletRequest request) {
		return build(HttpStatus.CONFLICT, ErrorCode.EMAIL_ALREADY_EXISTS, ex.getMessage(), request.getRequestURI(), null);
	}

	@ExceptionHandler(InvalidCredentialsException.class)
	public ResponseEntity<ApiErrorResponse> handleInvalidCredentials(
			InvalidCredentialsException ex,
			HttpServletRequest request) {
		return build(HttpStatus.UNAUTHORIZED, ErrorCode.INVALID_CREDENTIALS, ex.getMessage(), request.getRequestURI(), null);
	}

	@ExceptionHandler(InvalidRegistrationDataException.class)
	public ResponseEntity<ApiErrorResponse> handleInvalidRegistrationData(
			InvalidRegistrationDataException ex,
			HttpServletRequest request) {
		return build(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_FAILED, ex.getMessage(), request.getRequestURI(), null);
	}

	@ExceptionHandler(AuthenticationRequiredException.class)
	public ResponseEntity<ApiErrorResponse> handleAuthenticationRequired(
			AuthenticationRequiredException ex,
			HttpServletRequest request) {
		return build(HttpStatus.UNAUTHORIZED, ErrorCode.AUTHENTICATION_REQUIRED, ex.getMessage(), request.getRequestURI(), null);
	}

	@ExceptionHandler(AccessDeniedException.class)
	public ResponseEntity<ApiErrorResponse> handleAccessDenied(
			AccessDeniedException ex,
			HttpServletRequest request) {
		return build(HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN, "Access to this resource is forbidden", request.getRequestURI(), null);
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ApiErrorResponse> handleValidation(
			MethodArgumentNotValidException ex,
			HttpServletRequest request) {
		List<FieldErrorDetail> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
			.map(this::toFieldError)
			.toList();
		return build(
			HttpStatus.BAD_REQUEST,
			ErrorCode.VALIDATION_FAILED,
			"Request validation failed",
			request.getRequestURI(),
			fieldErrors
		);
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ApiErrorResponse> handleUnreadable(
			HttpMessageNotReadableException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.BAD_REQUEST,
			ErrorCode.INVALID_REQUEST,
			"Malformed request body",
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(NoResourceFoundException.class)
	public ResponseEntity<ApiErrorResponse> handleNoResourceFound(
			NoResourceFoundException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.NOT_FOUND,
			ErrorCode.RESOURCE_NOT_FOUND,
			"The requested API resource was not found.",
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ApiErrorResponse> handleUnexpected(
			Exception ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.INTERNAL_SERVER_ERROR,
			ErrorCode.INTERNAL_SERVER_ERROR,
			"An unexpected error occurred",
			request.getRequestURI(),
			null
		);
	}

	private FieldErrorDetail toFieldError(FieldError fieldError) {
		return new FieldErrorDetail(fieldError.getField(), fieldError.getDefaultMessage());
	}

	private ResponseEntity<ApiErrorResponse> build(
			HttpStatus status,
			ErrorCode code,
			String message,
			String path,
			List<FieldErrorDetail> fieldErrors) {
		ApiErrorResponse body = new ApiErrorResponse(
			Instant.now(),
			status.value(),
			status.getReasonPhrase(),
			code.name(),
			message,
			path,
			fieldErrors
		);
		return ResponseEntity.status(status).body(body);
	}
}
