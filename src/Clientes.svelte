<script>
  import { onMount, getContext } from "svelte";
  import { jsonData }            from "./store.js";

  import Buscar                  from "./Buscar.svelte";
  import Cliente                 from "./Cliente.svelte";
  import Boton                   from "./Boton.svelte";

  const URL = getContext("URL");

  let busqueda = "";
  let cliente = {};

  onMount(async () => {
    const response = await fetch(URL.clientes);
    const data = await response.json();
    $jsonData = data;
  });

  $: regex = new RegExp(busqueda, "i");
  $: datos = busqueda 
    ? $jsonData.filter(item => regex.test(item.nombre))
    : $jsonData;

</script>

<style>
  .container {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: left;
    flex-wrap: wrap;
  }
</style>

<h1>CLIENTES</h1>
<Buscar bind:busqueda />

<div class="container">
  <Cliente bind:cliente>
    <div style="text-align: right">
      <Boton documento={cliente} tipo="insertar" coleccion="clientes" />
    </div>
  </Cliente>
</div>

<div class="container">
  {#each datos as cliente}
    <Cliente {cliente}>
      <div style="text-align: right">
        <Boton documento={cliente} tipo="modificar" coleccion="clientes" />
        <Boton documento={cliente} tipo="eliminar" coleccion="clientes" />
      </div>
    </Cliente>
  {/each}
</div>