import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ─── CONFIG ────────────────────────────────────────────────────────────────
const API = "http://192.168.100.96:3000";

// ─── TYPES ─────────────────────────────────────────────────────────────────
type Screen =
  | "login"
  | "register"
  | "menu"
  | "changeName"
  | "changePass"
  | "cuentas"
  | "admin";

interface User {
  id: string;
  nombre: string;
}

// ─── HELPERS ───────────────────────────────────────────────────────────────
const post = async (path: string, body: object) => {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
};

// ─── APP ───────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Login
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");

  // Register
  const [regNombre, setRegNombre] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  // Change name
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [cnCurrentPass, setCnCurrentPass] = useState("");

  // Change password
  const [cpCurrentPass, setCpCurrentPass] = useState("");
  const [cpNewPass, setCpNewPass] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");

  // Cuentas / Admin
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [adminPass, setAdminPass] = useState("");
  const [adminVerified, setAdminVerified] = useState(false);
  const [selectedUserInfo, setSelectedUserInfo] = useState<any>(null);

  const nav = (s: Screen) => setScreen(s);

  const withLoad = async (fn: () => Promise<void>) => {
    setLoading(true);
    try {
      await fn();
    } catch {
      Alert.alert("Error de conexión", "No se pudo conectar al servidor.");
    } finally {
      setLoading(false);
    }
  };

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  const login = () =>
    withLoad(async () => {
      if (!nombre.trim() || !password) {
        Alert.alert("Campos requeridos", "Ingresa nombre y contraseña.");
        return;
      }
      const data = await post("/login", { nombre, password });
      if (data.ok) {
        setUser({ id: data.id, nombre: data.nombre });
        setNombre("");
        setPassword("");
        nav("menu");
      } else {
        Alert.alert("Acceso denegado", "Nombre o contraseña incorrectos.");
      }
    });

  // ── REGISTRO ───────────────────────────────────────────────────────────────
  // El servidor debe devolver { ok: false, error: "nombre_en_uso" } si ya existe
  const register = () =>
    withLoad(async () => {
      if (!regNombre.trim() || !regPassword) {
        Alert.alert("Campos requeridos", "Completa todos los campos.");
        return;
      }
      if (regPassword !== regConfirm) {
        Alert.alert("Error", "Las contraseñas no coinciden.");
        return;
      }
      const data = await post("/register", {
        nombre: regNombre.trim(),
        password: regPassword,
      });
      if (data.ok) {
        Alert.alert("¡Listo!", "Cuenta creada. Inicia sesión.");
        setRegNombre("");
        setRegPassword("");
        setRegConfirm("");
        nav("login");
      } else if (data.error === "nombre_en_uso") {
        Alert.alert("Nombre no disponible", `"${regNombre.trim()}" ya está registrado. Elige otro nombre.`);
      } else {
        Alert.alert("Error", data.error || "No se pudo crear la cuenta.");
      }
    });

  const logout = () => {
    setUser(null);
    setNombre("");
    setPassword("");
    nav("login");
  };

  // ── CAMBIAR NOMBRE ─────────────────────────────────────────────────────────
  const changeName = () =>
    withLoad(async () => {
      if (!nuevoNombre.trim()) {
        Alert.alert("Campo requerido", "Escribe el nuevo nombre.");
        return;
      }
      const verify = await post("/verify-password", {
        id: user!.id,
        password: cnCurrentPass,
      });
      if (!verify.ok) {
        Alert.alert("Error", "Contraseña incorrecta.");
        return;
      }
      const result = await post("/change-name", {
        id: user!.id,
        newName: nuevoNombre.trim(),
      });
      if (result.ok === false && result.error === "nombre_en_uso") {
        Alert.alert("Nombre no disponible", `"${nuevoNombre.trim()}" ya está registrado.`);
        return;
      }
      setUser((u) => (u ? { ...u, nombre: nuevoNombre.trim() } : u));
      setNuevoNombre("");
      setCnCurrentPass("");
      Alert.alert("¡Listo!", "Nombre actualizado correctamente.");
      nav("menu");
    });

  // ── CAMBIAR CONTRASEÑA ─────────────────────────────────────────────────────
  const changePassword = () =>
    withLoad(async () => {
      if (!cpNewPass) {
        Alert.alert("Campo requerido", "Ingresa la nueva contraseña.");
        return;
      }
      if (cpNewPass !== cpConfirm) {
        Alert.alert("Error", "Las contraseñas no coinciden.");
        return;
      }
      const verify = await post("/verify-password", {
        id: user!.id,
        password: cpCurrentPass,
      });
      if (!verify.ok) {
        Alert.alert("Error", "Contraseña incorrecta.");
        return;
      }
      await post("/change-password", { id: user!.id, newPassword: cpNewPass });
      setCpCurrentPass("");
      setCpNewPass("");
      setCpConfirm("");
      Alert.alert("¡Listo!", "Contraseña actualizada correctamente.");
      nav("menu");
    });

  // ── VER CUENTAS ────────────────────────────────────────────────────────────
  const getUsers = () =>
    withLoad(async () => {
      const res = await fetch(`${API}/users`);
      const data = await res.json();
      setUsers(data || []);
      nav("cuentas");
    });

  // ── VERIFICAR ADMIN Y VER INFO ─────────────────────────────────────────────
  // Verifica la contraseña actual del usuario "admin" en la BD.
  // El servidor busca nombre="admin" y compara — si cambió la contraseña, usa la nueva.
  const verifyAdminAndShow = async () => {
    if (!adminPass) {
      Alert.alert("Requerido", "Ingresa la contraseña de administrador.");
      return;
    }
    setLoading(true);
    try {
      const auth = await post("/verify-admin", { password: adminPass });
      Alert.alert("DEBUG respuesta", JSON.stringify(auth));
      if (!auth.ok) {
        Alert.alert("Acceso denegado", "Contraseña de administrador incorrecta.");
        return;
      }
      const info = await post("/admin/user-info", { id: selectedUser.id });
      setSelectedUserInfo(info);
      setAdminVerified(true);
      setAdminPass("");
    } catch (e: any) {
      Alert.alert("ERROR CATCH", e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  // ── BORRAR CUENTA ──────────────────────────────────────────────────────────
  const deleteAccount = () => {
    Alert.alert(
      "Borrar cuenta",
      `¿Seguro que quieres borrar la cuenta de "${selectedUser?.nombre}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar",
          style: "destructive",
          onPress: () =>
            withLoad(async () => {
              await post("/admin/delete-user", { id: selectedUser.id });
              // Actualizar lista local
              setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
              setSelectedUser(null);
              setSelectedUserInfo(null);
              setAdminVerified(false);
              Alert.alert("¡Listo!", "Cuenta eliminada correctamente.");
              nav("cuentas");
            }),
        },
      ]
    );
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {loading && (
          <View style={s.loadingOverlay}>
            <ActivityIndicator size="large" color="#000000" />
          </View>
        )}

        {/* ── LOGIN ─────────────────────────────────────────────────── */}
        {screen === "login" && (
          <ScrollView contentContainerStyle={s.center} keyboardShouldPersistTaps="handled">
            <View style={s.card}>
              <View style={s.iconCircle}>
                <Text style={s.iconEmoji}>🔐</Text>
              </View>
              <Text style={s.title}>Iniciar sesión</Text>
              <Text style={s.subtitle}>Bienvenido de nuevo</Text>

              <Field label="Nombre" value={nombre} onChangeText={setNombre} placeholder="Tu nombre" />
              <Field label="Contraseña" value={password} onChangeText={setPassword} placeholder="••••••••" secure />

              <PrimaryBtn label="Entrar" onPress={login} />
              <GhostBtn label="¿No tienes cuenta? Regístrate" onPress={() => nav("register")} />
            </View>
          </ScrollView>
        )}

        {/* ── REGISTER ──────────────────────────────────────────────── */}
        {screen === "register" && (
          <ScrollView contentContainerStyle={s.center} keyboardShouldPersistTaps="handled">
            <View style={s.card}>
              <BackBtn onPress={() => nav("login")} />
              <View style={s.iconCircle}>
                <Text style={s.iconEmoji}>📝</Text>
              </View>
              <Text style={s.title}>Crear cuenta</Text>
              <Text style={s.subtitle}>Regístrate gratis</Text>

              <Field label="Nombre" value={regNombre} onChangeText={setRegNombre} placeholder="Tu nombre" />
              <Field label="Contraseña" value={regPassword} onChangeText={setRegPassword} placeholder="••••••••" secure />
              <Field label="Confirmar contraseña" value={regConfirm} onChangeText={setRegConfirm} placeholder="••••••••" secure />

              <PrimaryBtn label="Crear cuenta" onPress={register} />
            </View>
          </ScrollView>
        )}

        {/* ── MENU ──────────────────────────────────────────────────── */}
        {screen === "menu" && user && (
          <ScrollView contentContainerStyle={s.center}>
            <View style={s.card}>
              <View style={s.avatarCircle}>
                <Text style={s.avatarLetter}>
                  {user.nombre.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={s.title}>{user.nombre}</Text>
              <Text style={s.subtitle}>Mi cuenta</Text>

              <MenuRow icon="✏️" label="Cambiar nombre" onPress={() => nav("changeName")} />
              <MenuRow icon="🔒" label="Cambiar contraseña" onPress={() => nav("changePass")} />
              <MenuRow icon="👥" label="Ver cuentas" onPress={getUsers} />

              <View style={s.divider} />
              <GhostBtn label="Cerrar sesión" onPress={logout} danger />
            </View>
          </ScrollView>
        )}

        {/* ── CAMBIAR NOMBRE ────────────────────────────────────────── */}
        {screen === "changeName" && (
          <ScrollView contentContainerStyle={s.center} keyboardShouldPersistTaps="handled">
            <View style={s.card}>
              <BackBtn onPress={() => nav("menu")} />
              <View style={s.iconCircle}>
                <Text style={s.iconEmoji}>✏️</Text>
              </View>
              <Text style={s.title}>Cambiar nombre</Text>
              <Text style={s.subtitle}>Verifica tu identidad</Text>

              <Field label="Contraseña actual" value={cnCurrentPass} onChangeText={setCnCurrentPass} placeholder="••••••••" secure />
              <Field label="Nuevo nombre" value={nuevoNombre} onChangeText={setNuevoNombre} placeholder="Nuevo nombre" />

              <PrimaryBtn label="Guardar cambios" onPress={changeName} />
            </View>
          </ScrollView>
        )}

        {/* ── CAMBIAR CONTRASEÑA ────────────────────────────────────── */}
        {screen === "changePass" && (
          <ScrollView contentContainerStyle={s.center} keyboardShouldPersistTaps="handled">
            <View style={s.card}>
              <BackBtn onPress={() => nav("menu")} />
              <View style={s.iconCircle}>
                <Text style={s.iconEmoji}>🔒</Text>
              </View>
              <Text style={s.title}>Cambiar contraseña</Text>
              <Text style={s.subtitle}>Verifica tu identidad</Text>

              <Field label="Contraseña actual" value={cpCurrentPass} onChangeText={setCpCurrentPass} placeholder="••••••••" secure />
              <Field label="Nueva contraseña" value={cpNewPass} onChangeText={setCpNewPass} placeholder="••••••••" secure />
              <Field label="Confirmar contraseña" value={cpConfirm} onChangeText={setCpConfirm} placeholder="••••••••" secure />

              <PrimaryBtn label="Guardar cambios" onPress={changePassword} />
            </View>
          </ScrollView>
        )}

        {/* ── CUENTAS ───────────────────────────────────────────────── */}
        {screen === "cuentas" && (
          <ScrollView contentContainerStyle={s.center}>
            <View style={s.card}>
              <BackBtn onPress={() => nav("menu")} />
              <Text style={s.title}>Usuarios</Text>
              <Text style={s.subtitle}>
                {users.length} cuenta{users.length !== 1 ? "s" : ""} registrada{users.length !== 1 ? "s" : ""}
              </Text>

              {users.map((u, i) => (
                <TouchableOpacity
                  key={u.id || i}
                  style={s.userRow}
                  onPress={() => {
                    setSelectedUser(u);
                    setAdminPass("");
                    setAdminVerified(false);
                    setSelectedUserInfo(null);
                    nav("admin");
                  }}
                  activeOpacity={0.6}
                >
                  <View style={s.userAvatar}>
                    <Text style={s.userAvatarLetter}>
                      {u.nombre.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={s.userRowText}>{u.nombre}</Text>
                  <Text style={s.chevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {/* ── ADMIN ─────────────────────────────────────────────────── */}
        {screen === "admin" && selectedUser && (
          <ScrollView contentContainerStyle={s.center} keyboardShouldPersistTaps="handled">
            <View style={s.card}>
              <BackBtn onPress={() => {
                setAdminVerified(false);
                setSelectedUserInfo(null);
                nav("cuentas");
              }} />

              <View style={s.avatarCircle}>
                <Text style={s.avatarLetter}>
                  {selectedUser.nombre.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={s.title}>{selectedUser.nombre}</Text>
              <Text style={s.subtitle}>Panel de administrador</Text>

              {/* ── Sin verificar: pedir contraseña ── */}
              {!adminVerified && (
                <>
                  <View style={s.infoBox}>
                    <Text style={s.infoText}>
                      Ingresa la contraseña actual de la cuenta{" "}
                      <Text style={{ fontWeight: "700", color: "#000" }}>admin</Text>
                      {" "}guardada en la base de datos.
                    </Text>
                  </View>

                  <Field
                    label="Contraseña de administrador"
                    value={adminPass}
                    onChangeText={setAdminPass}
                    placeholder="••••••••"
                    secure
                  />

                  <PrimaryBtn label="Ver información" onPress={verifyAdminAndShow} />
                </>
              )}

              {/* ── Verificado: mostrar info ── */}
              {adminVerified && selectedUserInfo && (
                <>
                  {/* Tarjeta de info */}
                  <View style={s.infoCard}>
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>NOMBRE</Text>
                      <Text style={s.infoValue}>{selectedUserInfo.nombre}</Text>
                    </View>
                    <View style={s.infoRowDivider} />
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>CONTRASEÑA</Text>
                      <Text style={s.infoValue}>{selectedUserInfo.password}</Text>
                    </View>
                  </View>

                  {/* Botón borrar cuenta */}
                  <TouchableOpacity style={s.deleteBtn} onPress={deleteAccount} activeOpacity={0.8}>
                    <Text style={s.deleteBtnText}>🗑 Borrar cuenta</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────

const Field = ({
  label,
  value,
  onChangeText,
  placeholder,
  secure = false,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secure?: boolean;
}) => (
  <View style={s.fieldWrap}>
    <Text style={s.fieldLabel}>{label}</Text>
    <TextInput
      style={s.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#AAAAAA"
      secureTextEntry={secure}
      autoCapitalize="none"
      autoCorrect={false}
    />
  </View>
);

const PrimaryBtn = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <TouchableOpacity style={s.primaryBtn} onPress={onPress} activeOpacity={0.8}>
    <Text style={s.primaryBtnText}>{label}</Text>
  </TouchableOpacity>
);

const GhostBtn = ({
  label,
  onPress,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) => (
  <TouchableOpacity style={s.ghostBtn} onPress={onPress} activeOpacity={0.6}>
    <Text style={[s.ghostBtnText, danger && { color: "#000000", fontWeight: "600" }]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const BackBtn = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={s.backBtn} onPress={onPress} activeOpacity={0.6}>
    <Text style={s.backBtnText}>‹ Atrás</Text>
  </TouchableOpacity>
);

const MenuRow = ({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) => (
  <TouchableOpacity style={s.menuRow} onPress={onPress} activeOpacity={0.6}>
    <Text style={s.menuRowIcon}>{icon}</Text>
    <Text style={s.menuRowLabel}>{label}</Text>
    <Text style={s.chevron}>›</Text>
  </TouchableOpacity>
);

// ─── STYLES ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  center: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.82)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99,
  },

  // ── Card ──────────────────────────────────
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#ECECEC",
  },

  // ── Icons / Avatars ───────────────────────
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  iconEmoji: { fontSize: 28 },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  avatarLetter: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // ── Typography ────────────────────────────
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000000",
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
    marginBottom: 24,
  },

  // ── Fields ────────────────────────────────
  fieldWrap: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#555555",
    marginBottom: 7,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#F7F7F7",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#000000",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },

  // ── Buttons ───────────────────────────────
  primaryBtn: {
    backgroundColor: "#000000",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  ghostBtn: {
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 2,
  },
  ghostBtnText: {
    color: "#777777",
    fontSize: 14,
    fontWeight: "500",
  },
  backBtn: { marginBottom: 14 },
  backBtnText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "500",
  },

  // ── Delete Button ─────────────────────────
  deleteBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: "#000000",
  },
  deleteBtnText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },

  // ── Menu Rows ─────────────────────────────
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F7F7",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  menuRowIcon: { fontSize: 18, marginRight: 14 },
  menuRowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#111111",
  },
  chevron: { fontSize: 20, color: "#BBBBBB" },
  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 10,
  },

  // ── User Rows ─────────────────────────────
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  userAvatarLetter: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  userRowText: {
    flex: 1,
    fontSize: 15,
    color: "#111111",
    fontWeight: "500",
  },

  // ── Info Box (sin verificar) ───────────────
  infoBox: {
    backgroundColor: "#F7F7F7",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  infoText: {
    fontSize: 13,
    color: "#666666",
    lineHeight: 19,
    textAlign: "center",
  },

  // ── Info Card (verificado) ────────────────
  infoCard: {
    backgroundColor: "#F7F7F7",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    overflow: "hidden",
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoRowDivider: {
    height: 1,
    backgroundColor: "#E8E8E8",
    marginHorizontal: 16,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#888888",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "500",
    color: "#000000",
    maxWidth: "65%",
    textAlign: "right",
  },
});