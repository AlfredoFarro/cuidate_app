import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { COLORS } from "@/theme/colors";
import { trainingClient } from "@/api/apiClient";
import { userService } from "@/services/UserService";
import type { RootStackParamList } from "@/navigation/AppNavigator";

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

    useEffect(() => {
        const loadEvaluable = async () => {
            try {
                await userService.loadStorage();

                const payload = {
                    document: userService.user.dni ?? "",
                    email: userService.user.email ?? "",
                };

                const res = await trainingClient.post<TrainingResponse>(
                    "/training/app/evaluable",
                    payload,
                );
                setTrainings(Array.isArray(res.data?.data) ? res.data.data : []);
                console.log(
                    "[TrainingMenu] /training/app/evaluable payload:",
                    payload,
                );
                console.log(
                    "[TrainingMenu] /training/app/evaluable OK:",
                    res.data,
                );
            } catch (error) {
                console.log(
                    "[TrainingMenu] /training/app/evaluable ERROR:",
                    error,
                );
            }
        };

        void loadEvaluable();
    }, []);

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Trainings</Text>

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
