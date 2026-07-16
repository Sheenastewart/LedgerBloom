package com.ledgerbloom.category;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CategoryRepository extends JpaRepository<Category, Long> {

	@Query("select c from Category c where c.user.id = :userId order by lower(c.name)")
	List<Category> findByUser_IdOrderByNameIgnoreCase(@Param("userId") Long userId);

	Optional<Category> findByIdAndUser_Id(Long id, Long userId);

	boolean existsByUser_IdAndNameIgnoreCase(Long userId, String name);

	boolean existsByUser_IdAndNameIgnoreCaseAndIdNot(Long userId, String name, Long id);
}
