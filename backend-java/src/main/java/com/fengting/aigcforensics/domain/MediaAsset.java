package com.fengting.aigcforensics.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "media_asset")
public class MediaAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "asset_id", nullable = false, unique = true, length = 64)
    private String assetId;

    @Column(name = "original_filename", nullable = false)
    private String originalFilename;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "file_size", nullable = false)
    private long fileSize;

    @Column(name = "sha256", nullable = false, unique = true, length = 64)
    private String sha256;

    @Column(name = "width", nullable = false)
    private int width;

    @Column(name = "height", nullable = false)
    private int height;

    @Column(name = "storage_path", nullable = false, length = 1024)
    private String storagePath;

    @Column(name = "thumbnail_path", length = 1024)
    private String thumbnailPath;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected MediaAsset() {
    }

    public MediaAsset(
            String assetId,
            String originalFilename,
            String contentType,
            long fileSize,
            String sha256,
            int width,
            int height,
            String storagePath,
            String thumbnailPath,
            Instant createdAt) {
        this.assetId = assetId;
        this.originalFilename = originalFilename;
        this.contentType = contentType;
        this.fileSize = fileSize;
        this.sha256 = sha256;
        this.width = width;
        this.height = height;
        this.storagePath = storagePath;
        this.thumbnailPath = thumbnailPath;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getAssetId() {
        return assetId;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public String getContentType() {
        return contentType;
    }

    public long getFileSize() {
        return fileSize;
    }

    public String getSha256() {
        return sha256;
    }

    public int getWidth() {
        return width;
    }

    public int getHeight() {
        return height;
    }

    public String getStoragePath() {
        return storagePath;
    }

    public String getThumbnailPath() {
        return thumbnailPath;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
