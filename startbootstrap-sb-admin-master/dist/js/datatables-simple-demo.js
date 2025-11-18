window.addEventListener('DOMContentLoaded', event => {
    const datatablesSimple = document.getElementById('datatablesSimple');
    if (datatablesSimple && datatablesSimple.dataset.autoInit === 'true') {
        new simpleDatatables.DataTable(datatablesSimple);
    }
});
