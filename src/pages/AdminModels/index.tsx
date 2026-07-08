import { useEffect, useState } from 'react';
import { Button, PageContainer } from '@/components/primitives';
import { checkModelHealth, listModels, type ModelHealthResponse, type ModelSummaryResponse } from '@/api/backend';
import { formatDate } from '@/pages/adminFormat';
import styles from './AdminModels.module.css';

export function AdminModels() {
  const [models, setModels] = useState<ModelSummaryResponse[]>([]);
  const [health, setHealth] = useState<Record<string, ModelHealthResponse>>({});
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const loadModels = async () => {
    setError(null);
    try {
      setModels(await listModels());
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'Failed to load model registry.');
    }
  };

  const refreshHealth = async (nextModels = models) => {
    setChecking(true);
    setError(null);
    try {
      const results = await Promise.allSettled(nextModels.map((model) => checkModelHealth(model.modelId)));
      const nextHealth: Record<string, ModelHealthResponse> = {};
      results.forEach((result) => {
        if (result.status === 'fulfilled') nextHealth[result.value.modelId] = result.value;
      });
      setHealth(nextHealth);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'Failed to check model health.');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    let active = true;
    listModels()
      .then((nextModels) => {
        if (!active) return [];
        setModels(nextModels);
        return Promise.allSettled(nextModels.map((model) => checkModelHealth(model.modelId)));
      })
      .then((results) => {
        if (!active) return;
        const nextHealth: Record<string, ModelHealthResponse> = {};
        results.forEach((result) => {
          if (result.status === 'fulfilled') nextHealth[result.value.modelId] = result.value;
        });
        setHealth(nextHealth);
      })
      .catch((apiError) => {
        if (active) setError(apiError instanceof Error ? apiError.message : 'Failed to load models.');
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <PageContainer width="wide">
      <div className={styles.page}>
        <header className="pageHeader">
          <p className="italic-quote">- Models are operational dependencies -</p>
          <h1 className="pageTitle">Models</h1>
          <p className="pageEnglish">REGISTRY</p>
        </header>

        {error ? <p className={styles.error}>{error}</p> : null}

        <section className={styles.toolbar}>
          <div>
            <span className={styles.eyebrow}>Registry</span>
            <h2>{models.length} registered models</h2>
          </div>
          <div className={styles.actions}>
            <Button variant="text" onClick={() => void loadModels()}>Reload</Button>
            <Button variant="secondary" onClick={() => void refreshHealth()} disabled={checking}>Health Check</Button>
          </div>
        </section>

        <section className={styles.grid}>
          {models.map((model) => {
            const modelHealth = health[model.modelId];
            const healthy = modelHealth?.healthy ?? false;
            return (
              <article className={styles.card} key={model.modelId}>
                <header>
                  <span className={`${styles.dot} ${healthy ? styles.online : styles.offline}`} />
                  <div>
                    <h2>{model.displayName}</h2>
                    <p>{model.modelId} - {model.version}</p>
                  </div>
                </header>
                <p className={styles.description}>{model.description}</p>
                <dl>
                  <dt>Endpoint</dt>
                  <dd>{model.endpointUrl}</dd>
                  <dt>Type</dt>
                  <dd>{model.modelType}</dd>
                  <dt>Threshold</dt>
                  <dd>{model.defaultThreshold.toFixed(2)}</dd>
                  <dt>Weight</dt>
                  <dd>{model.weight.toFixed(2)}</dd>
                  <dt>Health</dt>
                  <dd>{modelHealth ? `${modelHealth.status} - ${formatDate(modelHealth.checkedAt)}` : 'Not checked'}</dd>
                </dl>
              </article>
            );
          })}
          {!models.length ? <p className={styles.empty}>No models are registered yet.</p> : null}
        </section>
      </div>
    </PageContainer>
  );
}

