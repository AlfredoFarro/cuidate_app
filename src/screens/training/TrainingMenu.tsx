import React, { useEffect, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { AxiosError } from "axios";
import { COLORS } from "@/theme/colors";
import { trainingClient } from "@/api/apiClient";
import { userService } from "@/services/UserService";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import {
    FormIonSelect,
    type IonSelectOption,
} from "@/components/form/FormIonSelect";

type TrainingItem = {
    id: string;
    startDate: string;
    status: string;
    collaborator?: {
        name?: string;
    };
    template?: {
        name?: string;
        totalPeriods?: number;
    };
    area?: {
        name?: string;
    };
    progress?: {
        percentage?: number;
        completedPeriods?: number;
        totalPeriods?: number;
    };
};

type TrainingResponse = {
    data?: TrainingItem[];
};

type TrainingMenuNav = StackNavigationProp<RootStackParamList, "TrainingMenu">;

type OptionItem = {
    id: string;
    name: string;
};

type OptionResponse = {
    data?: OptionItem[];
};

type ApiErrorResponse = {
    message?: string;
};

type TrainingStatusFilter = "" | "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

const STATUS_OPTIONS: IonSelectOption<TrainingStatusFilter>[] = [
    { value: "", label: "Todos" },
    { value: "NOT_STARTED", label: "No iniciado" },
    { value: "IN_PROGRESS", label: "En progreso" },
    { value: "COMPLETED", label: "Completado" },
];

function formatDate(value?: string) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("es-PE");
}

function formatStatus(status?: string) {
    if (!status) return "-";
    switch (status) {
        case "NOT_STARTED":
            return "No iniciado";
        case "IN_PROGRESS":
            return "En progreso";
        case "COMPLETED":
            return "Completado";
        case "PENDING":
            return "Pendiente";
        default:
            return status;
    }
}

function clampPercent(value?: number) {
    if (typeof value !== "number" || !Number.isFinite(value)) return 0;
    return Math.min(100, Math.max(0, Math.round(value)));
}

export function TrainingMenu() {
    const navigation = useNavigation<TrainingMenuNav>();
    const [trainings, setTrainings] = useState<TrainingItem[]>([]);
    const [projectOptions, setProjectOptions] = useState<
        IonSelectOption<string>[]
    >([]);
    const [areaOptions, setAreaOptions] = useState<IonSelectOption<string>[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    const [selectedAreaId, setSelectedAreaId] = useState<string>("");
    const [selectedStatus, setSelectedStatus] =
        useState<TrainingStatusFilter>("");

    const loadEvaluable = async (filters?: {
        projectId?: string;
        areaId?: string;
        status?: TrainingStatusFilter;
    }) => {
        try {
            await userService.loadStorage();
            const payload = {
                document: userService.user.dni ?? "",
                email: userService.user.email ?? "",
            };
            const res = await trainingClient.post<TrainingResponse>(
                "/training/app/evaluable",
                payload,
                {
                    params: {
                        ...(filters?.projectId
                            ? { projectId: filters.projectId }
                            : {}),
                        ...(filters?.areaId ? { areaId: filters.areaId } : {}),
                        ...(filters?.status ? { status: filters.status } : {}),
                    },
                },
            );
            setTrainings(Array.isArray(res.data?.data) ? res.data.data : []);
            console.log("[TrainingMenu] /training/app/evaluable payload:", payload);
            console.log("[TrainingMenu] /training/app/evaluable params:", filters);
            console.log("[TrainingMenu] /training/app/evaluable OK:", res.data);
        } catch (error) {
            console.log("[TrainingMenu] /training/app/evaluable ERROR:", error);
            const err = error as AxiosError<ApiErrorResponse>;
            const msg =
                err.response?.data?.message ??
                "No se pudo consultar los trainings.";
            Alert.alert("Training", msg);
        }
    };

    useEffect(() => {
        const mapOptions = (items?: OptionItem[]) => {
            const base: IonSelectOption<string>[] = [
                { value: "", label: "Todos" },
            ];

            if (!Array.isArray(items)) {
                return base;
            }

            return [
                ...base,
                ...items.map((item) => ({
                    value: item.id,
                    label: item.name,
                })),
            ];
        };

        const loadProjectOptions = async () => {
            try {
                const res = await trainingClient.get<OptionResponse>(
                    "/project/app/options",
                );
                setProjectOptions(mapOptions(res.data?.data));
                console.log("[TrainingMenu] /project/app/options OK:", res.data);
            } catch (error) {
                console.log("[TrainingMenu] /project/app/options ERROR:", error);
            }
        };

        const loadAreaOptions = async (projectId?: string) => {
            try {
                const res = await trainingClient.get<OptionResponse>(
                    "/area/app/options",
                    {
                        params: projectId ? { projectId } : undefined,
                    },
                );
                setAreaOptions(mapOptions(res.data?.data));
                console.log("[TrainingMenu] /area/app/options OK:", res.data);
            } catch (error) {
                console.log("[TrainingMenu] /area/app/options ERROR:", error);
            }
        };

        const bootstrap = async () => {
            await userService.loadStorage();
            await Promise.all([loadProjectOptions(), loadAreaOptions()]);
            await loadEvaluable();
        };

        void bootstrap();
    }, []);

    useEffect(() => {
        const loadAreaOptions = async () => {
            try {
                await userService.loadStorage();
                const res = await trainingClient.get<OptionResponse>(
                    "/area/app/options",
                    {
                        params: selectedProjectId
                            ? { projectId: selectedProjectId }
                            : undefined,
                    },
                );
                setAreaOptions([
                    { value: "", label: "Todos" },
                    ...((res.data?.data ?? []).map((item) => ({
                        value: item.id,
                        label: item.name,
                    })) as IonSelectOption<string>[]),
                ]);
                console.log(
                    "[TrainingMenu] /area/app/options filtered OK:",
                    res.data,
                );
            } catch (error) {
                console.log(
                    "[TrainingMenu] /area/app/options filtered ERROR:",
                    error,
                );
            }
        };

        setSelectedAreaId("");
        void loadAreaOptions();
    }, [selectedProjectId]);

    const onFilter = () => {
        void loadEvaluable({
            projectId: selectedProjectId || undefined,
            areaId: selectedAreaId || undefined,
            status: selectedStatus || undefined,
        });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Trainings</Text>

                <View style={styles.filtersCard}>
                    <Text style={styles.filtersTitle}>Filtros</Text>

                    <FormIonSelect<string>
                        label="Proyecto"
                        value={selectedProjectId}
                        options={projectOptions}
                        onChange={setSelectedProjectId}
                        placeholder="Todos"
                        searchable
                        searchPlaceholder="Buscar proyecto"
                    />

                    <FormIonSelect<string>
                        label="Area"
                        value={selectedAreaId}
                        options={areaOptions}
                        onChange={setSelectedAreaId}
                        placeholder="Todos"
                        searchable
                        searchPlaceholder="Buscar area"
                    />

                    <FormIonSelect<TrainingStatusFilter>
                        label="Estado"
                        value={selectedStatus}
                        options={STATUS_OPTIONS}
                        onChange={setSelectedStatus}
                        placeholder="Todos"
                    />

                    <TouchableOpacity
                        style={styles.filterButton}
                        activeOpacity={0.85}
                        onPress={onFilter}
                    >
                        <Text style={styles.filterButtonText}>Filtrar</Text>
                    </TouchableOpacity>
                </View>

                {trainings.length === 0 ? (
                    <Text style={styles.emptyText}>
                        No hay trainings disponibles.
                    </Text>
                ) : (
                    trainings.map((training) => {
                        const completed =
                            training.progress?.completedPeriods ?? 0;
                        const total =
                            training.progress?.totalPeriods ??
                            training.template?.totalPeriods ??
                            0;
                        const progressPercent = clampPercent(
                            training.progress?.percentage,
                        );
                        const periodPercent = clampPercent(
                            total > 0 ? (completed / total) * 100 : 0,
                        );

                        return (
                            <TouchableOpacity
                                key={training.id}
                                style={styles.card}
                                activeOpacity={0.85}
                                onPress={() =>
                                    navigation.navigate("TrainingMatrix", {
                                        trainingId: training.id,
                                    })
                                }
                            >
                                <Text style={styles.item}>
                                    <Text style={styles.label}>
                                        Nombre del colaborador:{" "}
                                    </Text>
                                    {training.collaborator?.name ?? "-"}
                                </Text>
                                <Text style={styles.item}>
                                    <Text style={styles.label}>
                                        Nombre de la matriz / entrenamiento:{" "}
                                    </Text>
                                    {training.template?.name ?? "-"}
                                </Text>
                                <Text style={styles.item}>
                                    <Text style={styles.label}>Area: </Text>
                                    {training.area?.name ?? "-"}
                                </Text>
                                <Text style={styles.item}>
                                    <Text style={styles.label}>
                                        Fecha de inicio:{" "}
                                    </Text>
                                    {formatDate(training.startDate)}
                                </Text>
                                <View style={styles.statusRow}>
                                    <Text style={styles.label}>Estado</Text>
                                    <View
                                        style={[
                                            styles.statusBadge,
                                            training.status === "COMPLETED" &&
                                                styles.statusCompleted,
                                            training.status === "IN_PROGRESS" &&
                                                styles.statusInProgress,
                                            training.status === "NOT_STARTED" &&
                                                styles.statusNotStarted,
                                        ]}
                                    >
                                        <Text style={styles.statusBadgeText}>
                                            {formatStatus(training.status)}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.progressBlock}>
                                    <View style={styles.progressHeader}>
                                        <Text style={styles.label}>Avance</Text>
                                        <Text style={styles.progressValue}>
                                            {progressPercent}%
                                        </Text>
                                    </View>
                                    <View style={styles.progressTrack}>
                                        <View
                                            style={[
                                                styles.progressFill,
                                                { width: `${progressPercent}%` },
                                            ]}
                                        />
                                    </View>
                                </View>

                                <View style={styles.progressBlock}>
                                    <View style={styles.progressHeader}>
                                        <Text style={styles.label}>
                                            Periodos completados
                                        </Text>
                                        <Text style={styles.progressValue}>
                                            {completed} / {total}
                                        </Text>
                                    </View>
                                    <View style={styles.progressTrack}>
                                        <View
                                            style={[
                                                styles.progressFill,
                                                styles.periodFill,
                                                { width: `${periodPercent}%` },
                                            ]}
                                        />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })
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
    title: {
        color: COLORS.text,
        fontSize: 22,
        fontWeight: "700",
        marginBottom: 16,
    },
    filtersCard: {
        backgroundColor: COLORS.white,
        borderRadius: 14,
        padding: 16,
        marginBottom: 14,
    },
    filtersTitle: {
        color: COLORS.dark,
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 4,
    },
    filterButton: {
        marginTop: 16,
        backgroundColor: COLORS.primary,
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: "center",
    },
    filterButtonText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: "700",
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 14,
        padding: 16,
        marginBottom: 14,
    },
    label: {
        fontWeight: "700",
        color: COLORS.changePasswordTitle,
    },
    item: {
        color: COLORS.text,
        fontSize: 14,
        lineHeight: 21,
        marginBottom: 8,
    },
    statusRow: {
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
        marginTop: 2,
    },
    statusBadge: {
        backgroundColor: COLORS.textMuted,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    statusCompleted: {
        backgroundColor: COLORS.successGreen,
    },
    statusInProgress: {
        backgroundColor: COLORS.primary,
    },
    statusNotStarted: {
        backgroundColor: COLORS.locked,
    },
    statusBadgeText: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: "700",
    },
    progressBlock: {
        marginBottom: 12,
    },
    progressHeader: {
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    progressValue: {
        color: COLORS.changePasswordTitle,
        fontSize: 13,
        fontWeight: "700",
    },
    progressTrack: {
        backgroundColor: COLORS.changePasswordBg,
        borderRadius: 999,
        height: 9,
        overflow: "hidden",
    },
    progressFill: {
        backgroundColor: COLORS.primary,
        borderRadius: 999,
        height: "100%",
    },
    periodFill: {
        backgroundColor: COLORS.secondary,
    },
    emptyText: {
        color: COLORS.textMuted,
        fontSize: 15,
    },
});
