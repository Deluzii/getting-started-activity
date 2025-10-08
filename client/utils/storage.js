export function saveCharacter(character) {
  localStorage.setItem("rpg_character", JSON.stringify(character));
}

export function loadCharacter() {
  const data = localStorage.getItem("rpg_character");
  return data ? JSON.parse(data) : null;
}

export function clearCharacter() {
  localStorage.removeItem("rpg_character");
}
