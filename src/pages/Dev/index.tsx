import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Close, Plus, Spinner } from '@/components/icons';
import { Button, Card, EdgeRule, Input, Modal, SideSheet, TextArea, useToast } from '@/components/primitives';
import styles from './Dev.module.css';

export function Dev() {
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { showToast } = useToast();

  return (
    <main className={styles.page}>
      <EdgeRule position="top" />

      <header className={styles.header}>
        <p className="mono">DEVELOP PRIMITIVES</p>
        <h1>基础组件库</h1>
        <span>Tokens, motion, primitives</span>
      </header>

      <section className={styles.section}>
        <h2>Button</h2>
        <div className={styles.row}>
          <Button variant="primary" suffix={<ArrowRight />}>Primary</Button>
          <Button variant="secondary" prefix={<ArrowLeft />}>Secondary</Button>
          <Button variant="text" prefix="─" suffix={<ArrowRight />}>Text action</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
      </section>

      <section className={styles.grid}>
        <Card hoverable>
          <p className="mono">CARD HOVERABLE</p>
          <h2>证据卡片</h2>
          <p>底部显影线在 hover 时从左到右扫出。</p>
        </Card>
        <Card padding="sm">
          <p className="mono">CARD SM</p>
          <h2>小间距</h2>
          <p>用于密集信息块。</p>
        </Card>
        <Card padding="lg">
          <p className="mono">CARD LG</p>
          <h2>大间距</h2>
          <p>用于页面主叙事区域。</p>
        </Card>
      </section>

      <section className={styles.section}>
        <h2>Input / TextArea</h2>
        <div className={styles.formGrid}>
          <Input placeholder="样本 ID" />
          <Input placeholder="检测任务名称" />
          <TextArea placeholder="备注信息" />
        </div>
      </section>

      <section className={styles.section}>
        <h2>Modal / SideSheet / Toast</h2>
        <div className={styles.row}>
          <Button variant="secondary" onClick={() => setModalOpen(true)}>Open Modal</Button>
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>Open SideSheet</Button>
          <Button variant="primary" onClick={() => showToast('任务已加入检测队列', 'success')}>Success Toast</Button>
          <Button variant="secondary" onClick={() => showToast('低置信度样本需复核', 'info')}>Info Toast</Button>
          <Button variant="secondary" onClick={() => showToast('上传失败，请重试', 'error')}>Error Toast</Button>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Icons</h2>
        <div className={styles.icons}>
          <ArrowRight />
          <ArrowLeft />
          <Close />
          <Check />
          <Plus />
          <ChevronDown />
          <Spinner className={styles.spinner} />
        </div>
      </section>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className={styles.dialogCopy}>
          <p className="mono">MODAL</p>
          <h2>显影确认</h2>
          <p>这是基础弹窗，支持遮罩关闭和 Esc 关闭。</p>
          <Button variant="primary" onClick={() => setModalOpen(false)}>确认</Button>
        </div>
      </Modal>

      <SideSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)}>
        <div className={styles.dialogCopy}>
          <p className="mono">SIDE SHEET</p>
          <h2>右侧面板</h2>
          <p>用于检测配置、报告详情和治理信息抽屉。</p>
          <Input placeholder="面板内输入框" />
        </div>
      </SideSheet>

      <EdgeRule position="bottom" />
    </main>
  );
}
