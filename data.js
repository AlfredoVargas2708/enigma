// Los partidos se cargan desde "Horarios Campeonato.txt" al iniciar la app.
let MATCHES = [];

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
