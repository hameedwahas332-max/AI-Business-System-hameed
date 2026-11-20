import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
  key?: React.Key;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  declare state: State;
  declare props: Readonly<Props>;
  declare setState: (state: Partial<State> | ((prevState: State) => Partial<State>)) => void;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[UNCAUGHT_REACT_ERROR]', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 text-center" dir="rtl">
          <div className="m3-card-elevated rounded-3xl p-8 max-w-lg w-full space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--md-warning-container)] border border-[var(--md-warning)]/30 text-[var(--md-on-warning-container)] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-lg font-black text-[var(--md-on-surface)]">
                {this.props.fallbackTitle || 'تعذر تحميل محتوى هذه الشاشة مؤقتاً'}
              </h2>
              <p className="text-xs text-[var(--md-on-surface-variant)] mt-1 leading-relaxed">
                تمت حماية النظام بنجاح من الإغلاق المفاجئ. يمكنك إعادة المحاولة الآن أو الانتقال إلى قسم آخر.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="bg-[var(--md-error-container)] p-3 rounded-xl border border-[var(--md-error)]/30 text-[11px] text-[var(--md-on-error-container)] font-mono text-left dir-ltr break-all">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
              <button
                type="button"
                onClick={this.handleRetry}
                className="m3-btn-primary text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-primary)]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة المحاولة وتحديث الشاشة</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.hash = '#overview';
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('erp_navigate_tab', { detail: 'overview' }));
                  }
                }}
                className="m3-btn-outlined text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-primary)]"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>الرئيسية</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
