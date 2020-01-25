<script>
  import Nav from "./Nav.svelte";
  import Contenido from "./Contenido.svelte";
  import { Router, Link, Route } from "svelte-routing";

  import { setContext } from "svelte";

// https://tiendapwa.herokuapp.com

  const URL = {
    articulos :  "/api/articulos/",
    clientes :   "/api/clientes/"
  };

  // const jsonData = [];

  setContext("URL", URL);
  // setContext("jsonData", jsonData);
</script>

<style>
  @import url("https://fonts.googleapis.com/css?family=Aclonica");

  :global(body) {
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    font-family: "Aclonica";
  }

  :global(*) {
    margin: 0;
    padding: 0;
  }

  :global(a:hover) {
    text-decoration: none;
    cursor: pointer;
  }

  :global(div#OK, div#KO) {
    display: none;
    position: fixed;
    top: 60px;
    right: 0px;
    font-size: 60px;
    background-color: transparent;
  }
</style>

<Router>
  <Nav />
  <Contenido />
</Router>
<div id="OK">😊</div>
<div id="KO">😟</div>
<div id="prueba"></div>