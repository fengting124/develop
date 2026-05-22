import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Input, Modal, PageContainer, useToast } from '@/components/primitives';
import { ExpertCard } from '@/components/ExpertCard/ExpertCard';
import { expertsCore, expertsLora } from '@/data/mocks';
import styles from './AdminExperts.module.css';

export function AdminExperts() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [extra, setExtra] = useState(false);
  const { showToast } = useToast();

  const startTraining = () => {
    setOpen(false);
    setExtra(true);
    showToast('新专家进入训练队列', 'success');
  };

  return (
    <PageContainer width="normal">
    <div className={styles.page}>
      <header className="pageHeader">
        <p className="italic-quote">─ A constellation of expertise ─</p>
        <h1 className="pageTitle">专 家 库</h1>
        <p className="pageEnglish">EXPERTS</p>
      </header>
      <hr />
      <section>
        <h2 className={styles.groupTitle}>核心专家</h2>
        <div className={styles.cards}>{expertsCore.map((item) => <ExpertCard key={item.name} type="core" {...item} />)}</div>
      </section>
      <hr />
      <section>
        <header className={styles.sectionHead}>
          <h2 className={styles.groupTitle}>靶向专家</h2>
          <Button variant="text" prefix="+" onClick={() => setOpen(true)}>新增</Button>
        </header>
        <div className={styles.grid}>
          {expertsLora.map((item) => <ExpertCard key={item.id} type="lora" {...item} />)}
          {extra ? (
            <motion.div initial={{ opacity: 0, scale: 0.85, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <ExpertCard
                type="lora"
                id="α-05"
                generatorName="GPT Image"
                generatorShort="GPT-IMG"
                logoSrc="/images/generators/gpt-image.png"
                status="training"
                trainingProgress={0.28}
              />
            </motion.div>
          ) : null}
        </div>
      </section>
      <Modal isOpen={open} onClose={() => setOpen(false)} width={560}>
        <div className={styles.wizard}>
          <p>─ Bring a new expert to life ─</p>
          <h2>新增靶向专家</h2>
          <hr />
          <span>Step {step} of 4</span>
          {step === 1 ? <><label>编号<Input defaultValue="α-05" /></label><label>备注（选填）<Input /></label></> : null}
          {step === 2 ? <div className={styles.options}>{['从异常池', '从已有库', '上传新数据'].map((x) => <button key={x} type="button">○ {x}</button>)}</div> : null}
          {step === 3 ? <div className={styles.options}><button type="button">○ 启用自动调参</button><button type="button">● 自动加入专家库</button></div> : null}
          {step === 4 ? <div className={styles.summary}>编号 α-05<br />数据源 异常池<br />自动加入专家库</div> : null}
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => setOpen(false)}>取消</Button>
            {step < 4 ? <Button onClick={() => setStep((v) => v + 1)}>下一步 →</Button> : <Button onClick={startTraining}>启动训练</Button>}
          </div>
        </div>
      </Modal>
    </div>
    </PageContainer>
  );
}
