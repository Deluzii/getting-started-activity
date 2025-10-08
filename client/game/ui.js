export function showMainMenu(onCreateCharacter) {
  const app = document.querySelector('#app');
  app.innerHTML = `
    <div id="main-menu" class="menu-container">
      <h1 class="game-title">Fight With Me</h1>
      <p class="subtitle">Embark on your adventure!</p>
      <button id="create-btn" class="menu-btn">Create Character</button>
    </div>
  `;
  document.getElementById('create-btn').addEventListener('click', onCreateCharacter);
}
