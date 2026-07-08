package com.fengting.aigcforensics.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.fengting.aigcforensics.domain.MediaAsset;

public interface MediaAssetRepository extends JpaRepository<MediaAsset, Long> {

    Optional<MediaAsset> findByAssetId(String assetId);

    Optional<MediaAsset> findBySha256(String sha256);
}
