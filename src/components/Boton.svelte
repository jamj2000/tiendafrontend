<script>
  import { onMount, getContext } from "svelte";
  import { jsonData }            from "./store.js";

  export let tipo = "insertar"; // insertar, modificar, eliminar
  export let coleccion = "articulos"; // articulos, clientes
  export let documento = {};
  
 
  let handler = () => {};  
  let clases = "";
  let url = "";

  const URL = getContext("URL"); 

  onMount(() => {
    switch (tipo) {
      case "insertar":
        handler = insertar;
        clases = "btn btn-insertar";
        break;
      case "modificar":
        handler = modificar;
        clases = "btn btn-modificar";
        break;
      case "eliminar":
        handler = eliminar;
        clases = "btn btn-eliminar";
        break;
      default:
    }

    switch (coleccion) {
      case "articulos": url=URL.articulos; break;
      case "clientes": url=URL.clientes; break;
      default:
    }
  });

  function insertar() {
    if (
      Object.keys(documento).length > 1 &&
      Object.values(documento).every(x => x !== undefined && x != "")
    ) {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(documento)
      })
        .then(res => res.json())
        .then(data => {
          $jsonData = [...$jsonData, data];
          ok();
        })
        .catch(err => ko());
    }
  }

  function modificar() {
    fetch(url + documento._id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(documento)
    })
      .then(res => res.json())
      .then(data => ok())
      .catch(err => ko());
  }

  function eliminar() {
    fetch(url + documento._id, { method: "DELETE" })
      .then(res => res.json())
      .then(data => {
        $jsonData = $jsonData.filter(x => x._id !== data._id);
        ok();
      })
      .catch(err => ko());
  }

  let ok = () => {
    OK.style.display = "block";
    setTimeout(() => (OK.style.display = "none"), 1500);
  }

  let ko = () => {
    KO.style.display = "block";
    setTimeout(() => (KO.style.display = "none"), 1500);
  }
</script>

<style>
  .btn {
    font-weight: bold;
    padding-left: 20px;
    padding-right: 20px;
    cursor: pointer;
    border-radius: 3px;
    font-size: 1em;
    transition: all 0.3s ease-in-out;
  }

  .btn:hover {
    box-shadow: 0 2px 6px 0 rgba(0, 0, 0, 0.2), 0 3px 10px 0 rgba(0, 0, 0, 0.19);
  }

  /* Botón para insertar */
  .btn-insertar {
    border: 1px solid #13a600;
    color: #13a600;
    background-color: lightgreen;
  }
  .btn-insertar::before {
    content: "✏️";
  }
  .btn-insertar::after {
    content: " Insertar";
  }
  .btn-insertar:hover {
    background: #c1ffc9;
  }

  /* Botón para modificar */
  .btn-modificar {
    border: 1px solid #0085a6;
    color: #0085a6;
    background-color: lightblue;
  }
  .btn-modificar::before {
    content: "📝";
  }
  .btn-modificar::after {
    content: " Modificar";
  }
  .btn-modificar:hover {
    background: #a8e7f5;
  }

  /* Botón para eliminar */
  .btn-eliminar {
    border: 1px solid #ec0115;
    color: #ec0115;
    background-color: lightsalmon;
  }
  .btn-eliminar::before {
    content: "❌";
  }
  .btn-eliminar::after {
    content: " Eliminar";
  }
  .btn-eliminar:hover {
    background: #ffc1bf;
  }

  @media (max-width: 500px) {
    .btn-insertar::after,
    .btn-modificar::after,
    .btn-eliminar::after {
      content: none;
    }
  }
</style>

<button class={clases} on:click={handler} />
