package com.fengting.aigcforensics.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.fengting.aigcforensics.domain.ModelRegistry;

public interface ModelRegistryRepository extends JpaRepository<ModelRegistry, Long> {

    Optional<ModelRegistry> findByModelId(String modelId);

    List<ModelRegistry> findByEnabledTrueOrderByWeightDesc();
}
