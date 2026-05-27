import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteProp, useRoute } from "@react-navigation/native";
import { COLORS } from "@/theme/colors";
import { trainingClient } from "@/api/apiClient";
import { userService } from "@/services/UserService";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { loadingService } from "@/services/LoadingService";

type TrainingMatrixRoute = RouteProp<RootStackParamList, "TrainingMatrix">;

type MatrixOperation = {
    id: string;
    order: number;
    title: string;
    name: string;
    description: string;
    priority: string;
    weightPercent: number;
    code: string;
};

type MatrixPeriodScore = {
    operationId: string;
    score: number | null;
    notes: string | null;
};

type MatrixPeriod = {
    id: string;
    periodNumber: number;
    title: string;
    startDate: string;
    endDate: string;
    evaluationDate: string | null;
    status: string;
    canEdit: boolean;
    validationNotes: string | null;
    reinforcementNotes: string | null;
    qtyOperationTotal: number;
    qtyOperationStarted: number;
    scores: MatrixPeriodScore[];
};

type MatrixData = {
    training?: {
        id: string;
        startDate: string;
        status: string;
        result: string;
    };
    collaborator?: {
        name?: string;
        email?: string;
        dni?: string;
        educationLevel?: string;
    };
    template?: {
        name?: string;
        version?: number;
        periodDurationDays?: number;
        totalPeriods?: number;
        minimumPassingScore?: number;
    };
    project?: {
        name?: string;
    };
    area?: {
        name?: string;
    };
    summary?: {
        totalOperations?: number;
        totalPeriods?: number;
        minimumPassingScore?: number;
        editablePeriodNumber?: number;
    };
    operations?: MatrixOperation[];
    periods?: MatrixPeriod[];
};

type MatrixResponse = {
    data?: MatrixData;
};

type PeriodDraft = {
    evaluationDate: string;
    validationNotes: string;
    reinforcementNotes: string;
    scores: Record<string, string>;
};

type SavePeriodProgressPayload = {
    document: string;
    email: string;
    evaluationDate: string;
    validationNotes: string;
    reinforcementNotes: string;
    scores: {
        templateOperationId: string;
        score: number;
        checklist: string;
        notes: string;
    }[];
};

function formatDate(value?: string) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("es-PE");
}

function formatStatus(status?: string) {
    if (!status) return "-";
    switch (status) {
        case "IN_PROGRESS":
            return "En progreso";
        case "COMPLETED":
            return "Completado";
        case "PENDING":
            return "Pendiente";
        case "NOT_STARTED":
            return "No iniciado";
        default:
            return status;
    }
}

function priorityLabel(priority?: string) {
    if (!priority) return "-";
    switch (priority) {
        case "CRITICAL":
            return "Crítica";
        case "HIGH":
            return "Alta";
        case "MEDIUM":
            return "Media";
        case "LOW":
            return "Baja";
        default:
            return priority;
    }
}

function priorityStyle(priority?: string) {
    switch (priority) {
        case "CRITICAL":
            return styles.priorityCritical;
        case "HIGH":
            return styles.priorityHigh;
        case "MEDIUM":
            return styles.priorityMedium;
        default:
            return styles.priorityLow;
    }
}

function periodBadgeStyle(canEdit: boolean) {
    return canEdit ? styles.badgeEditable : styles.badgeLocked;
}

export function TrainingMatrix() {
    const route = useRoute<TrainingMatrixRoute>();
    const [matrix, setMatrix] = useState<MatrixData | null>(null);
    const [periodDrafts, setPeriodDrafts] = useState<Record<string, PeriodDraft>>(
        {},
    );

    const loadMatrix = async () => {
        try {
            await userService.loadStorage();

            const payload = {
                document: userService.user.dni ?? "",
                email: userService.user.email ?? "",
            };

            const res = await trainingClient.post<MatrixResponse>(
                `/training/app/${route.params.trainingId}/matrix`,
                payload,
            );

            setMatrix(res.data?.data ?? null);
            setPeriodDrafts(
                Object.fromEntries(
                    (res.data?.data?.periods ?? []).map((period) => [
                        period.id,
                        {
                            evaluationDate:
                                period.evaluationDate ?? period.startDate,
                            validationNotes: period.validationNotes ?? "",
                            reinforcementNotes:
                                period.reinforcementNotes ?? "",
                            scores: Object.fromEntries(
                                (period.scores ?? []).map((score) => [
                                    score.operationId,
                                    score.score == null
                                        ? ""
                                        : String(score.score),
                                ]),
                            ),
                        } satisfies PeriodDraft,
                    ]),
                ),
            );

            console.log(
                "[TrainingMatrix] /training/app/:id/matrix payload:",
                payload,
            );
            console.log(
                "[TrainingMatrix] /training/app/:id/matrix OK:",
                res.data,
            );
        } catch (error) {
            console.log(
                "[TrainingMatrix] /training/app/:id/matrix ERROR:",
                error,
            );
        }
    };

    useEffect(() => {
        void loadMatrix();
    }, [route.params.trainingId]);

    const operationsById = useMemo(() => {
        const map = new Map<string, MatrixOperation>();
        for (const operation of matrix?.operations ?? []) {
            map.set(operation.id, operation);
        }
        return map;
    }, [matrix?.operations]);

    const updatePeriodDraft = (
        periodId: string,
        updater: (draft: PeriodDraft) => PeriodDraft,
    ) => {
        setPeriodDrafts((prev) => {
            const current =
                prev[periodId] ??
                ({
                    evaluationDate: "",
                    validationNotes: "",
                    reinforcementNotes: "",
                    scores: {},
                } satisfies PeriodDraft);

            return {
                ...prev,
                [periodId]: updater(current),
            };
        });
    };

    const onRegisterPeriod = async (period: MatrixPeriod) => {
        try {
            await userService.loadStorage();
            await loadingService.present();

            const draft = periodDrafts[period.id];
            const minScore =
                matrix?.summary?.minimumPassingScore ??
                matrix?.template?.minimumPassingScore ??
                5;

            const payload: SavePeriodProgressPayload = {
                document: userService.user.dni ?? "",
                email: userService.user.email ?? "",
                evaluationDate: new Date().toISOString(),
                validationNotes:
                    draft?.validationNotes?.trim() ||
                    "Validación registrada desde app",
                reinforcementNotes:
                    draft?.reinforcementNotes?.trim() ||
                    "Reforzar operaciones observadas",
                scores: (period.scores ?? []).map((score) => ({
                    templateOperationId: score.operationId,
                    score: Number(draft?.scores?.[score.operationId] || score.score || minScore),
                    checklist: "",
                    notes: score.notes ?? "Registro enviado desde app",
                })),
            };

            const res = await trainingClient.post(
                `/training/app/periods/${period.id}/progress`,
                payload,
            );

            console.log(
                "[TrainingMatrix] /training/app/periods/:id/progress payload:",
                payload,
            );
            console.log(
                "[TrainingMatrix] /training/app/periods/:id/progress OK:",
                res.data,
            );

            await loadMatrix();
            Alert.alert("Training", "Registro del periodo enviado.");
        } catch (error) {
            console.log(
                "[TrainingMatrix] /training/app/periods/:id/progress ERROR:",
                error,
            );
            Alert.alert("Training", "No se pudo registrar el periodo.");
        } finally {
            await loadingService.dismiss();
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                {!matrix ? (
                    <Text style={styles.emptyText}>Cargando matriz...</Text>
                ) : (
                    <>
                        <View style={styles.hero}>
                            <Text style={styles.heroTitle}>Matriz de Entrenamiento</Text>
                            <Text style={styles.heroSubtitle}>
                                El colaborador debe obtener una calificación mínima de{" "}
                                {matrix.summary?.minimumPassingScore ??
                                    matrix.template?.minimumPassingScore ??
                                    0}{" "}
                                en {matrix.summary?.totalOperations ?? 0}{" "}
                                {matrix.summary?.totalOperations === 1
                                    ? "operación"
                                    : "operaciones"}
                                .
                            </Text>
                        </View>

                        <View style={styles.summaryRow}>
                            <View style={styles.summaryCard}>
                                <Text style={styles.summaryLabel}>Colaborador</Text>
                                <Text style={styles.summaryValue}>
                                    {matrix.collaborator?.name ?? "-"}
                                </Text>
                                <Text style={styles.summaryMeta}>
                                    DNI {matrix.collaborator?.dni ?? "-"}
                                </Text>
                            </View>
                            <View style={styles.summaryCard}>
                                <Text style={styles.summaryLabel}>Entrenamiento</Text>
                                <Text style={styles.summaryValue}>
                                    {matrix.template?.name ?? "-"}
                                </Text>
                                <Text style={styles.summaryMeta}>
                                    Versión {matrix.template?.version ?? "-"}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.summaryRow}>
                            <View style={styles.summaryCard}>
                                <Text style={styles.summaryLabel}>Área</Text>
                                <Text style={styles.summaryValue}>
                                    {matrix.area?.name ?? "-"}
                                </Text>
                                <Text style={styles.summaryMeta}>
                                    Proyecto {matrix.project?.name ?? "-"}
                                </Text>
                            </View>
                            <View style={styles.summaryCard}>
                                <Text style={styles.summaryLabel}>Estado</Text>
                                <Text style={styles.summaryValue}>
                                    {formatStatus(matrix.training?.status)}
                                </Text>
                                <Text style={styles.summaryMeta}>
                                    Inicio {formatDate(matrix.training?.startDate)}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.metricsCard}>
                            <View style={styles.metricBox}>
                                <Text style={styles.metricNumber}>
                                    {matrix.summary?.totalOperations ?? 0}
                                </Text>
                                <Text style={styles.metricLabel}>Operaciones</Text>
                            </View>
                            <View style={styles.metricBox}>
                                <Text style={styles.metricNumber}>
                                    {matrix.summary?.totalPeriods ?? 0}
                                </Text>
                                <Text style={styles.metricLabel}>Periodos</Text>
                            </View>
                            <View style={styles.metricBox}>
                                <Text style={styles.metricNumber}>
                                    {matrix.template?.periodDurationDays ?? 0}
                                </Text>
                                <Text style={styles.metricLabel}>Días por periodo</Text>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Operaciones</Text>
                            {(matrix.operations ?? []).map((operation) => (
                                <View key={operation.id} style={styles.operationCard}>
                                    <View style={styles.operationHeader}>
                                        <View style={styles.operationTitleWrap}>
                                            <Text style={styles.operationEyebrow}>
                                                Operación {operation.order}
                                            </Text>
                                            <Text style={styles.operationTitle}>
                                                {operation.title}
                                            </Text>
                                        </View>
                                        <View
                                            style={[
                                                styles.priorityPill,
                                                priorityStyle(operation.priority),
                                            ]}
                                        >
                                            <Text style={styles.priorityText}>
                                                {priorityLabel(operation.priority)}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={styles.operationName}>
                                        {operation.name}
                                    </Text>
                                    <Text style={styles.operationDescription}>
                                        {operation.description || "Sin descripción"}
                                    </Text>

                                    <View style={styles.operationMetaRow}>
                                        <Text style={styles.operationMeta}>
                                            Código: {operation.code}
                                        </Text>
                                        <Text style={styles.operationMeta}>
                                            Peso: {operation.weightPercent}%
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Periodos</Text>
                            {(matrix.periods ?? []).map((period) => (
                                <View key={period.id} style={styles.periodCard}>
                                    <View style={styles.periodHeader}>
                                        <View style={styles.periodTitleWrap}>
                                            <Text style={styles.periodEyebrow}>
                                                Periodo {period.periodNumber}
                                            </Text>
                                            <Text style={styles.periodTitle}>
                                                {period.title}
                                            </Text>
                                        </View>
                                        <View
                                            style={[
                                                styles.periodBadge,
                                                periodBadgeStyle(period.canEdit),
                                            ]}
                                        >
                                            <Text style={styles.periodBadgeText}>
                                                {period.canEdit ? "Editable" : "Bloqueado"}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.periodInfoRow}>
                                        <Text style={styles.periodInfo}>
                                            {formatDate(period.startDate)} -{" "}
                                            {formatDate(period.endDate)}
                                        </Text>
                                        <Text style={styles.periodInfo}>
                                            {formatStatus(period.status)}
                                        </Text>
                                    </View>

                                    <Text style={styles.periodProgress}>
                                        Operaciones iniciadas: {period.qtyOperationStarted} /{" "}
                                        {period.qtyOperationTotal}
                                    </Text>

                                    {(period.scores ?? []).map((score) => {
                                        const operation = operationsById.get(
                                            score.operationId,
                                        );
                                        const draft = periodDrafts[period.id];

                                        return (
                                            <View
                                                key={`${period.id}-${score.operationId}`}
                                                style={styles.scoreEditorCard}
                                            >
                                                <Text style={styles.scoreTitle}>
                                                    {operation?.title ?? "Operación"}
                                                </Text>
                                                <Text style={styles.scoreSubtitle}>
                                                    {operation?.code ?? "-"}
                                                </Text>
                                                <TextInput
                                                    style={[
                                                        styles.scoreInput,
                                                        !period.canEdit &&
                                                            styles.inputLocked,
                                                    ]}
                                                    value={
                                                        draft?.scores?.[
                                                            score.operationId
                                                        ] ?? ""
                                                    }
                                                    onChangeText={(value) =>
                                                        updatePeriodDraft(
                                                            period.id,
                                                            (current) => ({
                                                                ...current,
                                                                scores: {
                                                                    ...current.scores,
                                                                    [score.operationId]:
                                                                        value.replace(
                                                                            /[^0-9.]/g,
                                                                            "",
                                                                        ),
                                                                },
                                                            }),
                                                        )
                                                    }
                                                    placeholder="Puntaje"
                                                    placeholderTextColor={
                                                        COLORS.textMuted
                                                    }
                                                    keyboardType="numeric"
                                                    editable={period.canEdit}
                                                />
                                            </View>
                                        );
                                    })}

                                    {!period.canEdit ? (
                                        <>
                                            <Text style={styles.fieldLabel}>
                                                Validacion
                                            </Text>
                                            <TextInput
                                                style={[
                                                    styles.notesInput,
                                                    styles.inputLocked,
                                                ]}
                                                value={
                                                    periodDrafts[period.id]
                                                        ?.validationNotes ?? ""
                                                }
                                                placeholder="Escribe la validacion"
                                                placeholderTextColor={
                                                    COLORS.textMuted
                                                }
                                                multiline
                                                editable={false}
                                            />

                                            <Text style={styles.fieldLabel}>
                                                Que le falta reforzar
                                            </Text>
                                            <TextInput
                                                style={[
                                                    styles.notesInput,
                                                    styles.inputLocked,
                                                ]}
                                                value={
                                                    periodDrafts[period.id]
                                                        ?.reinforcementNotes ?? ""
                                                }
                                                placeholder="Escribe el refuerzo"
                                                placeholderTextColor={
                                                    COLORS.textMuted
                                                }
                                                multiline
                                                editable={false}
                                            />
                                        </>
                                    ) : null}

                                    {period.canEdit ? (
                                        <>
                                            <Text style={styles.fieldLabel}>
                                                Validación
                                            </Text>
                                            <TextInput
                                                style={styles.notesInput}
                                                value={
                                                    periodDrafts[period.id]
                                                        ?.validationNotes ?? ""
                                                }
                                                onChangeText={(value) =>
                                                    updatePeriodDraft(
                                                        period.id,
                                                        (current) => ({
                                                            ...current,
                                                            validationNotes:
                                                                value,
                                                        }),
                                                    )
                                                }
                                                placeholder="Escribe la validación"
                                                placeholderTextColor={
                                                    COLORS.textMuted
                                                }
                                                multiline
                                            />

                                            <Text style={styles.fieldLabel}>
                                                Qué le falta reforzar
                                            </Text>
                                            <TextInput
                                                style={styles.notesInput}
                                                value={
                                                    periodDrafts[period.id]
                                                        ?.reinforcementNotes ?? ""
                                                }
                                                onChangeText={(value) =>
                                                    updatePeriodDraft(
                                                        period.id,
                                                        (current) => ({
                                                            ...current,
                                                            reinforcementNotes:
                                                                value,
                                                        }),
                                                    )
                                                }
                                                placeholder="Escribe el refuerzo"
                                                placeholderTextColor={
                                                    COLORS.textMuted
                                                }
                                                multiline
                                            />

                                            <TouchableOpacity
                                                style={styles.registerButton}
                                                activeOpacity={0.85}
                                                onPress={() =>
                                                    void onRegisterPeriod(period)
                                                }
                                            >
                                                <Text
                                                    style={
                                                        styles.registerButtonText
                                                    }
                                                >
                                                    Subir puntaje
                                                </Text>
                                            </TouchableOpacity>
                                        </>
                                    ) : null}
                                </View>
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.changePasswordBg,
    },
    container: {
        padding: 16,
        paddingBottom: 32,
    },
    emptyText: {
        color: COLORS.textMuted,
        fontSize: 15,
    },
    hero: {
        backgroundColor: COLORS.dark,
        borderRadius: 18,
        padding: 18,
        marginBottom: 14,
    },
    heroTitle: {
        color: COLORS.white,
        fontSize: 22,
        fontWeight: "700",
        marginBottom: 8,
    },
    heroSubtitle: {
        color: COLORS.lightGray,
        fontSize: 14,
        lineHeight: 20,
    },
    summaryRow: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 12,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 14,
    },
    summaryLabel: {
        color: COLORS.textMuted,
        fontSize: 12,
        marginBottom: 6,
    },
    summaryValue: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 4,
    },
    summaryMeta: {
        color: COLORS.changePasswordTitle,
        fontSize: 12,
    },
    metricsCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 18,
    },
    metricBox: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 8,
    },
    metricNumber: {
        color: COLORS.primary,
        fontSize: 24,
        fontWeight: "700",
        marginBottom: 4,
    },
    metricLabel: {
        color: COLORS.changePasswordTitle,
        fontSize: 12,
    },
    section: {
        marginBottom: 18,
    },
    sectionTitle: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 12,
    },
    operationCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    operationHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 10,
        gap: 12,
    },
    operationTitleWrap: {
        flex: 1,
    },
    operationEyebrow: {
        color: COLORS.textMuted,
        fontSize: 12,
        marginBottom: 4,
    },
    operationTitle: {
        color: COLORS.text,
        fontSize: 17,
        fontWeight: "700",
    },
    priorityPill: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    priorityCritical: {
        backgroundColor: "#ff4d4f",
    },
    priorityHigh: {
        backgroundColor: "#ff8c42",
    },
    priorityMedium: {
        backgroundColor: COLORS.warningYellow,
    },
    priorityLow: {
        backgroundColor: COLORS.secondary,
    },
    priorityText: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: "700",
    },
    operationName: {
        color: COLORS.dark,
        fontSize: 14,
        fontWeight: "700",
        marginBottom: 6,
    },
    operationDescription: {
        color: COLORS.changePasswordTitle,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 10,
    },
    operationMetaRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
    },
    operationMeta: {
        color: COLORS.textMuted,
        fontSize: 12,
    },
    periodCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    periodHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 10,
    },
    periodTitleWrap: {
        flex: 1,
    },
    periodEyebrow: {
        color: COLORS.textMuted,
        fontSize: 12,
        marginBottom: 4,
    },
    periodTitle: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: "700",
        lineHeight: 22,
    },
    periodBadge: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    badgeEditable: {
        backgroundColor: COLORS.primary,
    },
    badgeLocked: {
        backgroundColor: COLORS.locked,
    },
    periodBadgeText: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: "700",
    },
    periodInfoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 8,
    },
    periodInfo: {
        color: COLORS.changePasswordTitle,
        fontSize: 13,
    },
    periodProgress: {
        color: COLORS.dark,
        fontSize: 13,
        fontWeight: "600",
        marginBottom: 12,
    },
    scoreEditorCard: {
        backgroundColor: COLORS.changePasswordBg,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    scoreTitle: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: "700",
        marginBottom: 2,
    },
    scoreSubtitle: {
        color: COLORS.textMuted,
        fontSize: 12,
        marginBottom: 10,
    },
    scoreInput: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        backgroundColor: COLORS.white,
        color: COLORS.text,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },
    inputLocked: {
        backgroundColor: COLORS.lightGray,
        color: COLORS.textMuted,
    },
    fieldLabel: {
        color: COLORS.changePasswordTitle,
        fontSize: 13,
        fontWeight: "700",
        marginTop: 6,
        marginBottom: 6,
    },
    notesInput: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        backgroundColor: COLORS.white,
        color: COLORS.text,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        minHeight: 92,
        textAlignVertical: "top",
    },
    registerButton: {
        marginTop: 8,
        backgroundColor: COLORS.primary,
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: "center",
    },
    registerButtonText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: "700",
    },
});
