import React, { useEffect, useState } from "react";
import {
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import DateTimePicker from "@react-native-community/datetimepicker";
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
        default:
            return status;
    }
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
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const loadEvaluable = async (filters?: {
        projectId?: string;
        areaId?: string;
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
                    },
                },
            );
            setTrainings(Array.isArray(res.data?.data) ? res.data.data : []);
            console.log("[TrainingMenu] /training/app/evaluable payload:", payload);
            console.log("[TrainingMenu] /training/app/evaluable params:", filters);
            console.log("[TrainingMenu] /training/app/evaluable OK:", res.data);
        } catch (error) {
            console.log("[TrainingMenu] /training/app/evaluable ERROR:", error);
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
                const payload = {
                    document: userService.user.dni ?? "",
                    email: userService.user.email ?? "",
                };
                const res = await trainingClient.post<OptionResponse>(
                    "/project/app/options",
                    payload,
                );
                setProjectOptions(mapOptions(res.data?.data));
                console.log("[TrainingMenu] /project/app/options OK:", res.data);
            } catch (error) {
                console.log("[TrainingMenu] /project/app/options ERROR:", error);
            }
        };

        const loadAreaOptions = async (projectId?: string) => {
            try {
                const payload = {
                    document: userService.user.dni ?? "",
                    email: userService.user.email ?? "",
                };
                const res = await trainingClient.post<OptionResponse>(
                    "/area/app/options",
                    payload,
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
                const payload = {
                    document: userService.user.dni ?? "",
                    email: userService.user.email ?? "",
                };
                const res = await trainingClient.post<OptionResponse>(
                    "/area/app/options",
                    payload,
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

    const onChangeDate = (_event: unknown, value?: Date) => {
        if (Platform.OS === "android") {
            setShowDatePicker(false);
        }
        if (value) {
            setSelectedDate(value);
        }
    };

    const onFilter = () => {
        void loadEvaluable({
            projectId: selectedProjectId || undefined,
            areaId: selectedAreaId || undefined,
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
                        label="Área"
                        value={selectedAreaId}
                        options={areaOptions}
                        onChange={setSelectedAreaId}
                        placeholder="Todos"
                        searchable
                        searchPlaceholder="Buscar área"
                    />

                    <Text style={styles.dateLabel}>Fecha</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        activeOpacity={0.85}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text style={styles.dateButtonText}>
                            {selectedDate
                                ? selectedDate.toLocaleDateString("es-PE")
                                : "Seleccionar fecha"}
                        </Text>
                    </TouchableOpacity>

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
                                    <Text style={styles.label}>Área: </Text>
                                    {training.area?.name ?? "-"}
                                </Text>
                                <Text style={styles.item}>
                                    <Text style={styles.label}>
                                        Fecha de inicio:{" "}
                                    </Text>
                                    {formatDate(training.startDate)}
                                </Text>
                                <Text style={styles.item}>
                                    <Text style={styles.label}>
                                        Estado del training:{" "}
                                    </Text>
                                    {formatStatus(training.status)}
                                </Text>
                                <Text style={styles.item}>
                                    <Text style={styles.label}>
                                        Porcentaje de avance:{" "}
                                    </Text>
                                    {training.progress?.percentage ?? 0}%
                                </Text>
                                <Text style={styles.item}>
                                    <Text style={styles.label}>
                                        Periodos completados / total de
                                        periodos:{" "}
                                    </Text>
                                    {completed} / {total}
                                </Text>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>

            {showDatePicker ? (
                <DateTimePicker
                    value={selectedDate ?? new Date()}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onChangeDate}
                />
            ) : null}
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
    dateLabel: {
        marginTop: 12,
        marginBottom: 6,
        fontWeight: "700",
        color: COLORS.textLabel,
        fontSize: 13,
    },
    dateButton: {
        borderWidth: 1,
        borderColor: COLORS.lightGray,
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 14,
        backgroundColor: COLORS.white,
        minHeight: 48,
        justifyContent: "center",
    },
    dateButtonText: {
        fontSize: 15,
        color: COLORS.text,
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
    emptyText: {
        color: COLORS.textMuted,
        fontSize: 15,
    },
});
