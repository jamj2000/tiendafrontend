<script>
  import { onMount, getContext } from "svelte";
  import { jsonData }            from "./store.js";

  import Buscar                  from "./Buscar.svelte";
  import Articulo                from "./Articulo.svelte";
  import Boton                   from "./Boton.svelte";

  const URL = getContext("URL");

  let busqueda = "";
  let articulo = {};

  onMount(async () => {
    const response = await fetch(URL.articulos);
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

<h1>ARTÍCULOS</h1>
<Buscar bind:busqueda />

<div class="container">
  <Articulo bind:articulo>
    <div style="text-align: right">
      <Boton documento={articulo} tipo="insertar" coleccion="articulos" />
    </div>
  </Articulo>
</div>

<div class="container">
  {#each datos as articulo}
    <Articulo {articulo}>
      <div style="text-align: right">
        <Boton documento={articulo} tipo="modificar" coleccion="articulos" />
        <Boton documento={articulo} tipo="eliminar"  coleccion="articulos" />
      </div>
    </Articulo>
  {/each}
</div>
