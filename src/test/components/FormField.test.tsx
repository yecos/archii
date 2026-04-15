import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
  ModalFooter,
} from '@/components/common/FormField';

describe('FormField', () => {
  it('renders label text', () => {
    render(<FormField label="Nombre">content</FormField>);
    expect(screen.getByText('Nombre')).toBeDefined();
  });

  it('shows asterisk when required=true', () => {
    render(<FormField label="Email" required>content</FormField>);
    const label = screen.getByText(/Email/);
    expect(label.textContent).toContain('*');
  });

  it('does not show asterisk when required is not set', () => {
    render(<FormField label="Descripción">content</FormField>);
    const label = screen.getByText(/Descripción/);
    expect(label.textContent).not.toContain('*');
  });

  it('renders children', () => {
    render(
      <FormField label="Campo">
        <input data-testid="child-input" />
      </FormField>
    );
    expect(screen.getByTestId('child-input')).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(
      <FormField label="Test" className="mb-4">
        <span>X</span>
      </FormField>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('mb-4');
  });
});

describe('FormInput', () => {
  it('renders an input element', () => {
    render(<FormInput placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text') as HTMLInputElement;
    expect(input.tagName).toBe('INPUT');
  });

  it('accepts value and onChange', () => {
    const onChange = vi.fn();
    render(<FormInput value="hello" onChange={onChange} />);
    const input = screen.getByDisplayValue('hello') as HTMLInputElement;
    expect(input.value).toBe('hello');
  });

  it('has skeuo-input class', () => {
    render(<FormInput />);
    const input = document.querySelector('input');
    expect(input?.className).toContain('skeuo-input');
  });

  it('spreads additional HTML attributes', () => {
    render(<FormInput type="email" name="email" required />);
    const input = document.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('email');
    expect(input.name).toBe('email');
    expect(input.required).toBe(true);
  });
});

describe('FormSelect', () => {
  it('renders a select element', () => {
    render(
      <FormSelect>
        <option value="a">Option A</option>
        <option value="b">Option B</option>
      </FormSelect>
    );
    const select = document.querySelector('select');
    expect(select).not.toBeNull();
    expect(screen.getByText('Option A')).toBeDefined();
  });

  it('has skeuo-input class', () => {
    render(<FormSelect><option>X</option></FormSelect>);
    const select = document.querySelector('select');
    expect(select?.className).toContain('skeuo-input');
  });
});

describe('FormTextarea', () => {
  it('renders a textarea element', () => {
    render(<FormTextarea placeholder="Write here..." />);
    const textarea = document.querySelector('textarea');
    expect(textarea).not.toBeNull();
  });

  it('has skeuo-input and resize-none classes', () => {
    render(<FormTextarea />);
    const textarea = document.querySelector('textarea');
    expect(textarea?.className).toContain('skeuo-input');
    expect(textarea?.className).toContain('resize-none');
  });
});

describe('ModalFooter', () => {
  it('renders submit and cancel buttons', () => {
    render(
      <ModalFooter onCancel={vi.fn()} onSubmit={vi.fn()} submitLabel="Guardar" />
    );
    expect(screen.getByText('Guardar')).toBeDefined();
    expect(screen.getByText('Cancelar')).toBeDefined();
  });

  it('calls onCancel when Cancelar is clicked', () => {
    const onCancel = vi.fn();
    render(<ModalFooter onCancel={onCancel} onSubmit={vi.fn()} submitLabel="OK" />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onSubmit when submit button is clicked', () => {
    const onSubmit = vi.fn();
    render(<ModalFooter onCancel={vi.fn()} onSubmit={onSubmit} submitLabel="Guardar" />);
    fireEvent.click(screen.getByText('Guardar'));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('disables submit button when submitDisabled=true', () => {
    render(
      <ModalFooter
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
        submitLabel="Guardar"
        submitDisabled={true}
      />
    );
    const btn = screen.getByText('Guardar') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('uses custom cancelLabel', () => {
    render(
      <ModalFooter
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
        submitLabel="OK"
        cancelLabel="Cerrar"
      />
    );
    expect(screen.getByText('Cerrar')).toBeDefined();
    expect(screen.queryByText('Cancelar')).toBeNull();
  });

  it('has skeuo-divider', () => {
    render(<ModalFooter onCancel={vi.fn()} onSubmit={vi.fn()} submitLabel="OK" />);
    const divider = document.querySelector('.skeuo-divider');
    expect(divider).not.toBeNull();
  });
});
