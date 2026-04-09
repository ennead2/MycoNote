// src/components/plan/PlanForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanForm } from './PlanForm';

describe('PlanForm', () => {
  it('renders all form fields', () => {
    render(<PlanForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/予定日/)).toBeInTheDocument();
    expect(screen.getByLabelText(/場所/)).toBeInTheDocument();
    expect(screen.getByText(/経験レベル/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /計画を相談する/ })).toBeInTheDocument();
  });

  it('calls onSubmit with form data', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PlanForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/場所/), '高尾山');
    await user.click(screen.getByText('中級者'));
    await user.click(screen.getByRole('button', { name: /計画を相談する/ }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const context = onSubmit.mock.calls[0][0];
    expect(context.location).toBe('高尾山');
    expect(context.experienceLevel).toBe('intermediate');
  });

  it('renders experience level buttons', () => {
    render(<PlanForm onSubmit={vi.fn()} />);
    expect(screen.getByText('初心者')).toBeInTheDocument();
    expect(screen.getByText('中級者')).toBeInTheDocument();
    expect(screen.getByText('上級者')).toBeInTheDocument();
  });
});
