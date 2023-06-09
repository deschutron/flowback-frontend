<script lang="ts">
	import { fetchRequest } from "$lib/FetchRequest";
	import { onMount } from "svelte";
    import { page } from '$app/stores'; 
	import Button from "$lib/Generic/Button.svelte";

    onMount(async() => {
    })

    const test = async () => {
        const { res, json } = await fetchRequest('POST', `group/poll/${$page.params.pollId}/predictions/list`);
    }
</script>


<div>
    PREDICT THIS *Punches*
    <Button action={test}>Testing</Button>
</div>