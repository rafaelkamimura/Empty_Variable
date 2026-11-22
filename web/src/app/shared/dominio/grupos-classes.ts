export function agruparClasses<T extends { grupo?: string }>(classes: readonly T[]) {
  return ["1-1", "1-2", "2-1", "2-2", "3", "4", "Outras"]
    .map((nome) => ({ nome, classes: classes.filter((classe) => (classe.grupo ?? "Outras") === nome) }))
    .filter((grupo) => grupo.classes.length > 0);
}
