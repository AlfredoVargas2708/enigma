// Datos del cronograma "Partidos Enigma - Fase de Grupos" (Chile)
const MATCHES = [
  // VIERNES
  { day: "Viernes", time: "16:00", category: "2da Varones", type: "varones", players: ["Martín", "Lauti"] },
  { day: "Viernes", time: "16:00", category: "4ta Fem", type: "fem", players: ["Flopy", "partner"] },
  { day: "Viernes", time: "17:15", category: "3ra Fem", type: "fem", players: ["Fi", "Chofa"] },
  { day: "Viernes", time: "17:15", category: "4ta Varones", type: "varones", players: ["Cris", "Juampi"] },
  { day: "Viernes", time: "18:30", category: "3era Fem", type: "fem", players: ["Isa", "Caro"] },
  { day: "Viernes", time: "19:45", category: "Mixto Open", type: "mixto", players: ["Flo"] },
  { day: "Viernes", time: "19:45", category: "1era Fem", type: "fem", players: ["Fi", "Chofa"] },
  { day: "Viernes", time: "21:00", category: "1era Fem", type: "fem", players: ["Isa", "Caro"] },
  { day: "Viernes", time: "21:00", category: "1era Fem", type: "fem", players: ["Vale", "Cata"] },
  { day: "Viernes", time: "21:00", category: "2da Varones", type: "varones", players: ["Martín", "Lauti"] },
  { day: "Viernes", time: "21:00", category: "6ta Varones", type: "varones", players: ["Melliz"] },

  // SÁBADO
  { day: "Sábado", time: "09:00", category: "4ta Varones", type: "varones", players: ["Joaco", "Gabo"] },
  { day: "Sábado", time: "10:15", category: "Mixto Open", type: "mixto", players: ["Flo"] },
  { day: "Sábado", time: "10:15", category: "1era Fem", type: "fem", players: ["Vale", "Cata"] },
  { day: "Sábado", time: "10:15", category: "5ta Varones", type: "varones", players: ["Dario", "Cristian"] },
  { day: "Sábado", time: "11:00", category: "3ra Fem", type: "fem", players: ["Fi", "Chofa"] },
  { day: "Sábado", time: "11:30", category: "2da Varones", type: "varones", players: ["Gean", "Diego"] },
  { day: "Sábado", time: "11:30", category: "4ta Varones", type: "varones", players: ["Alfredo", "Agus"] },
  { day: "Sábado", time: "12:45", category: "5ta Varones", type: "varones", players: ["Dario", "Cristian"] },
  { day: "Sábado", time: "14:00", category: "3era Fem", type: "fem", players: ["Isa", "Caro"] },
  { day: "Sábado", time: "14:00", category: "2da Varones", type: "varones", players: ["Gean", "Diego"] },
  { day: "Sábado", time: "14:00", category: "1ra Fem", type: "fem", players: ["Flo", "Pame"] },
  { day: "Sábado", time: "14:00", category: "1era Fem", type: "fem", players: ["Fi", "Chofa"] },
  { day: "Sábado", time: "14:00", category: "4ta Fem", type: "fem", players: ["Flopy", "partner"] },
  { day: "Sábado", time: "15:15", category: "6ta Varones", type: "varones", players: ["Melliz"] },
  { day: "Sábado", time: "16:30", category: "1era Fem", type: "fem", players: ["Isa", "Caro"] },
  { day: "Sábado", time: "16:30", category: "3ra Varones", type: "varones", players: ["Gonza", "Mati"] },
  { day: "Sábado", time: "17:45", category: "4ta Varones", type: "varones", players: ["Alfredo", "Agus"] },
  { day: "Sábado", time: "17:45", category: "1ra Fem", type: "fem", players: ["Flo", "Pame"] },
  { day: "Sábado", time: "17:45", category: "3ra Varones", type: "varones", players: ["Gonza", "Mati"] },
  { day: "Sábado", time: "19:00", category: "4ta Varones", type: "varones", players: ["Cris", "Juampi"] },
].map((m, i) => ({ ...m, id: `${m.day}-${m.time}-${i}` }));

// Colores/etiquetas de la leyenda de categorías (igual al póster)
const CATEGORY_TYPES = {
  varones: { label: "Categorías Masculinas", color: "#8bc34a" },
  fem: { label: "Categorías Femeninas", color: "#ec4899" },
  mixto: { label: "Categoría Mixta", color: "#a78bfa" },
};

// Estadísticas registrables por jugador
const STAT_FIELDS = [
  { key: "winners", label: "Winners", short: "W" },
  { key: "unforcedErrors", label: "Errores no forzados", short: "ENF" },
  { key: "forcedErrors", label: "Errores forzados", short: "EF" },
  { key: "aces", label: "Aces / Saques ganadores", short: "A" },
  { key: "doubleFaults", label: "Doble faltas", short: "DF" },
];
