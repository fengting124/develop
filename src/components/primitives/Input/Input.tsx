import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import styles from './Input.module.css';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;
export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Input(props: InputProps) {
  return <input className={styles.field} {...props} />;
}

export function TextArea(props: TextAreaProps) {
  return <textarea className={`${styles.field} ${styles.textarea}`} {...props} />;
}
