insert into model_registry (
    model_id,
    display_name,
    model_type,
    version,
    endpoint_url,
    enabled,
    default_threshold,
    weight,
    description,
    created_at,
    updated_at
) values (
    'nonescape-mini',
    'Nonescape Mini',
    'AI_IMAGE_DETECTOR',
    'v0',
    'http://localhost:5010',
    true,
    0.5,
    1.0,
    'Mini AI-generated image detector used as the first production model service.',
    current_timestamp,
    current_timestamp
);
