import calendar
import datetime
from typing import Any

from sqlalchemy import and_, case, func, not_, select
from sqlalchemy.orm import Session

from api.zaeron_api.models.classifier import (
    BatchExecution,
    ClassifierBatch,
    ClassifierBatchTransaction,
)
from api.zaeron_api.schemas.metrics import (
    BatchExecutionItem,
    BatchMetricsResponse,
    FinancialSummary,
    ImpactKPISummary,
    ImpactMetricsResponse,
    ImpactTimeSeriesPoint,
    MetricsSummaryResponse,
    OperationalImpact,
)
from api.zaeron_api.services.classifier import BatchNotFound



DEFAULT_HOURLY_RATE = 11.0


class MetricsService:
    """Calcula métricas financeiras e operacionais com consultas agregadas otimizadas."""

    def __init__(self, session: Session) -> None:
        self.session = session

    @staticmethod
    def calculate_hours_saved(processed_count: int) -> float:
        """Horas economizadas: max(0.2, round(qtd * 0.025, 1)) se qtd > 0 senão 0.0."""
        if processed_count <= 0:
            return 0.0
        return max(0.2, round(processed_count * 0.025, 1))

    @staticmethod
    def calculate_financial_savings(
        hours_saved: float, hourly_rate: float = DEFAULT_HOURLY_RATE
    ) -> float:
        """Economia em R$: round(horas * hourly_rate, 2)."""
        if hours_saved <= 0:
            return 0.0
        return round(hours_saved * hourly_rate, 2)

    @staticmethod
    def calculate_accuracy_percent(confident_count: int, total_count: int) -> float:
        """Assertividade %: (qtd com confiança >= 0.80 / qtd_total) * 100."""
        if total_count <= 0:
            return 0.0
        return round((confident_count / total_count) * 100.0, 1)

    @staticmethod
    def calculate_zero_cost_percent(local_count: int, total_count: int) -> float:
        """Taxa de regras operacionais %: (qtd executada localmente / qtd_total) * 100."""
        if total_count <= 0:
            return 0.0
        return round((local_count / total_count) * 100.0, 1)

    def _build_financial_and_operational_impact(
        self,
        *,
        total_count: int,
        total_expenses: float,
        total_income: float,
        total_volume: float,
        confident_count: int,
        local_count: int,
        processed_transactions: int,
    ) -> tuple[FinancialSummary, OperationalImpact]:
        net_balance = round(total_income - total_expenses, 2)
        average_ticket = (
            round(total_volume / total_count, 2) if total_count > 0 else 0.0
        )

        financial = FinancialSummary(
            total_expenses=round(total_expenses, 2),
            total_income=round(total_income, 2),
            net_balance=net_balance,
            average_ticket=average_ticket,
            total_transactions=total_count,
        )

        hours_saved = self.calculate_hours_saved(processed_transactions)
        financial_savings = self.calculate_financial_savings(hours_saved)
        accuracy_percent = self.calculate_accuracy_percent(
            confident_count, processed_transactions or total_count
        )
        zero_cost_percent = self.calculate_zero_cost_percent(
            local_count, processed_transactions or total_count
        )

        impact = OperationalImpact(
            hours_saved=hours_saved,
            financial_savings=financial_savings,
            accuracy_percent=accuracy_percent,
            zero_cost_percent=zero_cost_percent,
            total_processed_transactions=processed_transactions,
        )

        return financial, impact

    def get_batch_metrics(self, *, user_id: int, batch_id: int) -> BatchMetricsResponse:
        """Calcula métricas agregadas para um lote específico."""
        batch = (
            self.session.query(ClassifierBatch)
            .filter(
                ClassifierBatch.id == batch_id,
                ClassifierBatch.user_id == user_id,
            )
            .first()
        )
        if batch is None:
            raise BatchNotFound

        is_local_expr = and_(
            ClassifierBatchTransaction.classification_source != "Não classificado",
            not_(ClassifierBatchTransaction.classification_source.ilike("%ia%")),
            not_(ClassifierBatchTransaction.classification_source.ilike("%gemini%")),
            not_(ClassifierBatchTransaction.classification_source.ilike("%openai%")),
            not_(ClassifierBatchTransaction.classification_source.ilike("%gpt%")),
        )

        stmt = select(
            func.count(ClassifierBatchTransaction.id).label("total_count"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            ClassifierBatchTransaction.amount < 0,
                            func.abs(ClassifierBatchTransaction.amount),
                        ),
                        else_=0.0,
                    )
                ),
                0.0,
            ).label("total_expenses"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            ClassifierBatchTransaction.amount > 0,
                            ClassifierBatchTransaction.amount,
                        ),
                        else_=0.0,
                    )
                ),
                0.0,
            ).label("total_income"),
            func.coalesce(
                func.sum(func.abs(ClassifierBatchTransaction.amount)),
                0.0,
            ).label("total_volume"),
            func.coalesce(
                func.sum(
                    case(
                        (ClassifierBatchTransaction.confidence >= 0.80, 1),
                        else_=0,
                    )
                ),
                0,
            ).label("confident_count"),
            func.coalesce(
                func.sum(
                    case(
                        (is_local_expr, 1),
                        else_=0,
                    )
                ),
                0,
            ).label("local_count"),
        ).where(
            ClassifierBatchTransaction.batch_id == batch_id,
            ClassifierBatchTransaction.is_duplicate.is_(False),
        )

        row = self.session.execute(stmt).one()
        total_count = int(row.total_count or 0)
        total_expenses = float(row.total_expenses or 0.0)
        total_income = float(row.total_income or 0.0)
        total_volume = float(row.total_volume or 0.0)
        confident_count = int(row.confident_count or 0)
        local_count = int(row.local_count or 0)

        processed_transactions = (
            batch.processed_transactions
            if batch.status in ("processed", "exported")
            else 0
        )

        financial, impact = self._build_financial_and_operational_impact(
            total_count=total_count,
            total_expenses=total_expenses,
            total_income=total_income,
            total_volume=total_volume,
            confident_count=confident_count,
            local_count=local_count,
            processed_transactions=processed_transactions,
        )

        return BatchMetricsResponse(
            batch_id=batch.id,
            source_filename=batch.source_filename,
            status=batch.status,
            total_transactions=batch.total_transactions,
            duplicate_transactions=batch.duplicate_transactions,
            processed_transactions=batch.processed_transactions,
            financial=financial,
            impact=impact,
        )

    def get_metrics_summary(self, *, user_id: int) -> MetricsSummaryResponse:
        """Calcula métricas agregadas consolidadas de todos os lotes do usuário."""
        batch_stats_stmt = select(
            func.count(ClassifierBatch.id).label("total_batches"),
            func.coalesce(func.sum(ClassifierBatch.total_transactions), 0).label(
                "total_transactions"
            ),
            func.coalesce(func.sum(ClassifierBatch.duplicate_transactions), 0).label(
                "duplicate_transactions"
            ),
            func.coalesce(func.sum(ClassifierBatch.processed_transactions), 0).label(
                "processed_transactions"
            ),
        ).where(ClassifierBatch.user_id == user_id)

        batch_row = self.session.execute(batch_stats_stmt).one()
        total_batches = int(batch_row.total_batches or 0)
        total_transactions = int(batch_row.total_transactions or 0)
        duplicate_transactions = int(batch_row.duplicate_transactions or 0)
        processed_transactions = int(batch_row.processed_transactions or 0)

        is_local_expr = and_(
            ClassifierBatchTransaction.classification_source != "Não classificado",
            not_(ClassifierBatchTransaction.classification_source.ilike("%ia%")),
            not_(ClassifierBatchTransaction.classification_source.ilike("%gemini%")),
            not_(ClassifierBatchTransaction.classification_source.ilike("%openai%")),
            not_(ClassifierBatchTransaction.classification_source.ilike("%gpt%")),
        )

        tx_stats_stmt = (
            select(
                func.count(ClassifierBatchTransaction.id).label("total_count"),
                func.coalesce(
                    func.sum(
                        case(
                            (
                                ClassifierBatchTransaction.amount < 0,
                                func.abs(ClassifierBatchTransaction.amount),
                            ),
                            else_=0.0,
                        )
                    ),
                    0.0,
                ).label("total_expenses"),
                func.coalesce(
                    func.sum(
                        case(
                            (
                                ClassifierBatchTransaction.amount > 0,
                                ClassifierBatchTransaction.amount,
                            ),
                            else_=0.0,
                        )
                    ),
                    0.0,
                ).label("total_income"),
                func.coalesce(
                    func.sum(func.abs(ClassifierBatchTransaction.amount)),
                    0.0,
                ).label("total_volume"),
                func.coalesce(
                    func.sum(
                        case(
                            (ClassifierBatchTransaction.confidence >= 0.80, 1),
                            else_=0,
                        )
                    ),
                    0,
                ).label("confident_count"),
                func.coalesce(
                    func.sum(
                        case(
                            (is_local_expr, 1),
                            else_=0,
                        )
                    ),
                    0,
                ).label("local_count"),
            )
            .join(
                ClassifierBatch,
                ClassifierBatch.id == ClassifierBatchTransaction.batch_id,
            )
            .where(
                ClassifierBatch.user_id == user_id,
                ClassifierBatchTransaction.is_duplicate.is_(False),
            )
        )

        tx_row = self.session.execute(tx_stats_stmt).one()
        tx_count = int(tx_row.total_count or 0)
        total_expenses = float(tx_row.total_expenses or 0.0)
        total_income = float(tx_row.total_income or 0.0)
        total_volume = float(tx_row.total_volume or 0.0)
        confident_count = int(tx_row.confident_count or 0)
        local_count = int(tx_row.local_count or 0)

        financial, impact = self._build_financial_and_operational_impact(
            total_count=tx_count,
            total_expenses=total_expenses,
            total_income=total_income,
            total_volume=total_volume,
            confident_count=confident_count,
            local_count=local_count,
            processed_transactions=processed_transactions,
        )

        return MetricsSummaryResponse(
            total_batches=total_batches,
            total_transactions=total_transactions,
            duplicate_transactions=duplicate_transactions,
            processed_transactions=processed_transactions,
            financial=financial,
            impact=impact,
        )

    def _backfill_missing_batch_executions(self, user_id: int) -> None:
        """Sincroniza lotes processados legados que não possuem entrada em batch_executions."""
        existing_batch_ids = {
            row[0]
            for row in self.session.query(BatchExecution.batch_id)
            .filter(
                BatchExecution.user_id == user_id,
                BatchExecution.batch_id.isnot(None),
            )
            .all()
        }

        processed_batches = (
            self.session.query(ClassifierBatch)
            .filter(
                ClassifierBatch.user_id == user_id,
                ClassifierBatch.status.in_(("processed", "exported")),
            )
            .all()
        )

        missing = [b for b in processed_batches if b.id not in existing_batch_ids]
        if not missing:
            return

        for batch in missing:
            processable = [t for t in batch.transactions if not t.is_duplicate]
            rules_matched = 0
            ai_matched = 0
            for t in processable:
                src = (t.classification_source or "").lower()
                if any(term in src for term in ("ia", "gemini", "gpt", "openai", "inteligência", "deepseek")):
                    ai_matched += 1
                elif src not in ("não classificado", "pendente", ""):
                    rules_matched += 1

            hours_saved = self.calculate_hours_saved(len(processable))
            financial_saved = self.calculate_financial_savings(hours_saved)

            exec_row = BatchExecution(
                user_id=user_id,
                batch_id=batch.id,
                filename=batch.source_filename,
                total_rows=len(processable),
                rules_matched=rules_matched,
                ai_matched=ai_matched,
                hours_saved=hours_saved,
                financial_saved=financial_saved,
                created_at=batch.processed_at or batch.created_at or datetime.datetime.utcnow(),
            )
            self.session.add(exec_row)

        self.session.commit()

    def get_impact_metrics(
        self,
        *,
        user_id: int,
        period: str = "month",
        hourly_rate: float = DEFAULT_HOURLY_RATE,
    ) -> ImpactMetricsResponse:
        """Calcula KPIs consolidados, série temporal e histórico de lotes para a tela de Impacto."""
        self._backfill_missing_batch_executions(user_id)

        now = datetime.datetime.utcnow()
        period = (period or "month").lower().strip()

        start_date: datetime.datetime | None = None
        if period == "week":
            # Início da semana atual (Segunda-feira às 00:00:00)
            weekday = now.weekday()
            monday_date = now.date() - datetime.timedelta(days=weekday)
            start_date = datetime.datetime.combine(monday_date, datetime.time.min)
        elif period == "month":
            # Início do mês atual
            start_date = datetime.datetime(now.year, now.month, 1, 0, 0, 0)
        elif period == "year":
            # Início do ano atual
            start_date = datetime.datetime(now.year, 1, 1, 0, 0, 0)
        elif period == "all":
            start_date = None
        else:
            period = "month"
            start_date = datetime.datetime(now.year, now.month, 1, 0, 0, 0)

        query = self.session.query(BatchExecution).filter(BatchExecution.user_id == user_id)
        if start_date is not None:
            query = query.filter(BatchExecution.created_at >= start_date)

        executions = query.order_by(BatchExecution.created_at.desc()).all()

        # 1. KPIs agregados
        total_rows_sum = sum(e.total_rows for e in executions)
        rules_matched_sum = sum(e.rules_matched for e in executions)
        hours_saved_sum = round(sum(float(e.hours_saved) for e in executions), 1)
        financial_saved_sum = round(
            sum(
                self.calculate_financial_savings(float(e.hours_saved), hourly_rate)
                for e in executions
            ),
            2,
        )
        zero_cost_percent = (
            round((rules_matched_sum / total_rows_sum) * 100.0, 1)
            if total_rows_sum > 0
            else 0.0
        )

        kpis = ImpactKPISummary(
            hours_saved=hours_saved_sum,
            financial_saved=financial_saved_sum,
            total_reconciled=total_rows_sum,
            zero_cost_percent=zero_cost_percent,
            hourly_rate=hourly_rate,
        )

        # 2. Série Temporal
        time_series: list[ImpactTimeSeriesPoint] = []
        if period == "week":
            # 7 dias da semana atual
            monday = now.date() - datetime.timedelta(days=now.weekday())
            day_names = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
            for i in range(7):
                d = monday + datetime.timedelta(days=i)
                d_str = d.strftime("%Y-%m-%d")
                d_label = f"{day_names[i]} ({d.strftime('%d/%m')})"
                day_execs = [e for e in executions if e.created_at.date() == d]
                d_hours = round(sum(float(e.hours_saved) for e in day_execs), 1)
                d_fin = round(
                    sum(
                        self.calculate_financial_savings(float(e.hours_saved), hourly_rate)
                        for e in day_execs
                    ),
                    2,
                )
                d_rows = sum(e.total_rows for e in day_execs)
                time_series.append(
                    ImpactTimeSeriesPoint(
                        date=d_str,
                        label=d_label,
                        hours_saved=d_hours,
                        financial_saved=d_fin,
                        total_rows=d_rows,
                    )
                )
        elif period == "month":
            # Dias do mês corrente
            _, num_days = calendar.monthrange(now.year, now.month)
            for day_num in range(1, num_days + 1):
                d = datetime.date(now.year, now.month, day_num)
                d_str = d.strftime("%Y-%m-%d")
                d_label = d.strftime("%d/%m")
                day_execs = [e for e in executions if e.created_at.date() == d]
                d_hours = round(sum(float(e.hours_saved) for e in day_execs), 1)
                d_fin = round(
                    sum(
                        self.calculate_financial_savings(float(e.hours_saved), hourly_rate)
                        for e in day_execs
                    ),
                    2,
                )
                d_rows = sum(e.total_rows for e in day_execs)
                time_series.append(
                    ImpactTimeSeriesPoint(
                        date=d_str,
                        label=d_label,
                        hours_saved=d_hours,
                        financial_saved=d_fin,
                        total_rows=d_rows,
                    )
                )
        elif period == "year":
            # 12 meses do ano
            month_names = [
                "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
                "Jul", "Ago", "Set", "Out", "Nov", "Dez"
            ]
            for m in range(1, 13):
                m_str = f"{now.year}-{m:02d}"
                m_label = month_names[m - 1]
                month_execs = [
                    e for e in executions
                    if e.created_at.year == now.year and e.created_at.month == m
                ]
                m_hours = round(sum(float(e.hours_saved) for e in month_execs), 1)
                m_fin = round(
                    sum(
                        self.calculate_financial_savings(float(e.hours_saved), hourly_rate)
                        for e in month_execs
                    ),
                    2,
                )
                d_rows = sum(e.total_rows for e in month_execs)
                time_series.append(
                    ImpactTimeSeriesPoint(
                        date=m_str,
                        label=m_label,
                        hours_saved=m_hours,
                        financial_saved=m_fin,
                        total_rows=d_rows,
                    )
                )
        else:  # all
            month_names = [
                "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
                "Jul", "Ago", "Set", "Out", "Nov", "Dez"
            ]
            if executions:
                oldest_date = min(e.created_at for e in executions)
            else:
                oldest_date = now - datetime.timedelta(days=180)

            cur_y = oldest_date.year
            cur_m = oldest_date.month
            end_y = now.year
            end_m = now.month

            while (cur_y < end_y) or (cur_y == end_y and cur_m <= end_m):
                m_str = f"{cur_y}-{cur_m:02d}"
                m_label = f"{month_names[cur_m - 1]}/{str(cur_y)[-2:]}"
                m_execs = [
                    e for e in executions
                    if e.created_at.year == cur_y and e.created_at.month == cur_m
                ]
                m_hours = round(sum(float(e.hours_saved) for e in m_execs), 1)
                m_fin = round(
                    sum(
                        self.calculate_financial_savings(float(e.hours_saved), hourly_rate)
                        for e in m_execs
                    ),
                    2,
                )
                m_rows = sum(e.total_rows for e in m_execs)
                time_series.append(
                    ImpactTimeSeriesPoint(
                        date=m_str,
                        label=m_label,
                        hours_saved=m_hours,
                        financial_saved=m_fin,
                        total_rows=m_rows,
                    )
                )
                cur_m += 1
                if cur_m > 12:
                    cur_m = 1
                    cur_y += 1

        # 3. Histórico formatado
        history = [
            BatchExecutionItem(
                id=e.id,
                batch_id=e.batch_id,
                filename=e.filename,
                total_rows=e.total_rows,
                rules_matched=e.rules_matched,
                ai_matched=e.ai_matched,
                hours_saved=float(e.hours_saved),
                financial_saved=self.calculate_financial_savings(
                    float(e.hours_saved), hourly_rate
                ),
                zero_cost_percent=(
                    round((e.rules_matched / e.total_rows) * 100.0, 1)
                    if e.total_rows > 0
                    else 0.0
                ),
                created_at=e.created_at.isoformat(),
            )
            for e in executions
        ]

        return ImpactMetricsResponse(
            period=period,
            kpis=kpis,
            time_series=time_series,
            history=history,
        )


__all__ = ["MetricsService", "BatchNotFound"]

