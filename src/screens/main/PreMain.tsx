import React, { useLayoutEffect } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { StackNavigationProp } from "@react-navigation/stack";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { COLORS } from "../../theme/colors";
import { userService } from "../../services/UserService";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import type { User } from "../../interfaces/login";
import { RecordsHeader } from "../../components/shared/RecordsHeader";

type PreMainNav = StackNavigationProp<RootStackParamList, "PreMain">;

type PreMainRouteName = Extract<
    keyof RootStackParamList,
    "FormMenu" | "MedicalMenu" | "LearningMenu" | "TrainingMenu"
>;

const DEFAULT_MODULES: PreMainRouteName[] = [
    "FormMenu",
    "MedicalMenu",
    "LearningMenu",
    "TrainingMenu",
];

/**
 * `id` del proyecto -> pantalla del stack.
 * 1 Inspecciones -> FormMenu, 2 Capacitaciones -> LearningMenu,
 * 3 Salud ocupacional -> MedicalMenu, 4 Training -> TrainingMenu
 */
const PROJECT_ID_TO_ROUTE: Record<number, PreMainRouteName> = {
    1: "FormMenu",
    2: "LearningMenu",
    3: "MedicalMenu",
    4: "TrainingMenu",
};

function projectIdFromItem(o: Record<string, unknown>): number | null {
    const id = o.id;
    if (typeof id === "number" && Number.isFinite(id)) return id;
    if (typeof id === "string" && id.trim() !== "") {
        const n = Number(id);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

type ModuleBtnStyle = "btnForm" | "btnMedical" | "btnLearning";

const MODULE_UI: Record<
    PreMainRouteName,
    {
        title: string;
        hint: string;
        icon: React.ComponentProps<typeof Ionicons>["name"];
        btnStyle: ModuleBtnStyle;
    }
> = {
    FormMenu: {
        title: "Formularios",
        hint: "Módulo para registrar inspecciones de seguridad y hacer seguimiento a las acciones propuestas",
        icon: "document-text-outline",
        btnStyle: "btnForm",
    },
    MedicalMenu: {
        title: "Medical",
        hint: "Módulo para el registro de descansos médicos",
        icon: "medical-outline",
        btnStyle: "btnMedical",
    },
    LearningMenu: {
        title: "Learning",
        hint: "Módulo para realizar capacitaiones virtuales",
        icon: "school-outline",
        btnStyle: "btnLearning",
    },
    TrainingMenu: {
        title: "Training",
        hint: "Módulo para realizar entrenamientos virtuales",
        icon: "school-outline",
        btnStyle: "btnLearning",
    },
};

function routeForPamolsaItem(item: unknown): PreMainRouteName | null {
    if (!item || typeof item !== "object") return null;
    const pid = projectIdFromItem(item as Record<string, unknown>);
    if (pid == null) return null;
    return PROJECT_ID_TO_ROUTE[pid] ?? null;
}

type MenuRow = { route: PreMainRouteName; title: string };

function menuRowsFromUser(user: Partial<User>): MenuRow[] {
    const hasKey =
        user != null && typeof user === "object" && "pamolsa_projects" in user;
    const raw = user.pamolsa_projects;

    if (!hasKey || raw == null) {
        return DEFAULT_MODULES.map((route) => ({
            route,
            title: MODULE_UI[route].title,
        }));
    }

    if (!Array.isArray(raw) || raw.length === 0) {
        return [];
    }

    const seen = new Set<PreMainRouteName>();
    const rows: MenuRow[] = [];
    for (const item of raw) {
        const route = routeForPamolsaItem(item);
        if (!route || seen.has(route)) continue;
        seen.add(route);

        let title = MODULE_UI[route].title;
        if (item && typeof item === "object") {
            const n = (item as Record<string, unknown>).name;
            if (typeof n === "string" && n.trim().length > 0) {
                title = n.trim();
            }
        }
        rows.push({ route, title });
    }
    return rows;
}

export function PreMain() {
    const navigation = useNavigation<PreMainNav>();
    const modules = menuRowsFromUser(userService.user as Partial<User>);

    useLayoutEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation]);

    const logout = async () => {
        await userService.logout();
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: "Auth" }],
            }),
        );
    };

    return (
        <View style={styles.page}>
            <SafeAreaView style={styles.safeTop} edges={["top"]}>
                <RecordsHeader
                    title={userService.user.name ?? "Usuario"}
                    onBack={() => {}}
                    showBackButton={false}
                />
            </SafeAreaView>

            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
            >
                {modules.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <Text style={styles.emptyText}>
                            No tiene módulos asignados. Consulte con su
                            administrador.
                        </Text>
                    </View>
                ) : (
                    modules.map((mod) => {
                        const meta = MODULE_UI[mod.route];
                        return (
                            <TouchableOpacity
                                key={mod.route}
                                style={[styles.cardBtn, styles[meta.btnStyle]]}
                                onPress={() => navigation.navigate(mod.route)}
                                activeOpacity={0.88}
                            >
                                <Text style={styles.cardTitle}>
                                    {mod.title}
                                </Text>
                                <View style={styles.cardRow}>
                                    <Ionicons
                                        name={meta.icon}
                                        size={40}
                                        color={COLORS.white}
                                    />
                                    <Text style={styles.cardHint}>
                                        {meta.hint}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>

            <SafeAreaView style={styles.fabSafe} edges={["bottom"]}>
                <TouchableOpacity
                    style={styles.fab}
                    onPress={logout}
                    accessibilityLabel="Cerrar sesión"
                >
                    <Ionicons
                        name="log-out-outline"
                        size={26}
                        color={COLORS.white}
                    />
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: COLORS.changePasswordBg,
    },
    safeTop: {
        backgroundColor: COLORS.white,
    },
    headerStrip: {
        flexDirection: "row",
        height: 6,
        width: "100%",
    },
    stripSeg: { flex: 1 },
    stripRed: { backgroundColor: COLORS.danger },
    stripYellow: { backgroundColor: COLORS.warningYellow },
    stripGreen: { backgroundColor: COLORS.successGreen },
    welcomeTitle: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: COLORS.changePasswordTitle,
        fontSize: 13,
        fontWeight: "900",
        textAlign: "center",
    },
    scroll: {
        padding: 16,
        paddingBottom: 88,
        gap: 16,
    },
    cardBtn: {
        borderRadius: 15,
        paddingVertical: 20,
        paddingHorizontal: 16,
        minHeight: 100,
        justifyContent: "center",
    },
    btnForm: { backgroundColor: COLORS.primary },
    btnMedical: { backgroundColor: COLORS.danger },
    btnLearning: { backgroundColor: COLORS.dark },
    cardTitle: {
        color: COLORS.lightGray,
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 12,
    },
    cardRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    cardHint: {
        color: COLORS.lightGray,
        fontWeight: "700",
        fontSize: 13,
        flex: 1,
    },
    fabSafe: {
        position: "absolute",
        right: 16,
        bottom: 0,
        backgroundColor: "transparent",
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.textMuted,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
    },
    emptyWrap: {
        paddingVertical: 24,
        paddingHorizontal: 8,
    },
    emptyText: {
        color: COLORS.changePasswordTitle,
        fontSize: 14,
        textAlign: "center",
        lineHeight: 20,
    },
});
