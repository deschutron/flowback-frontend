<script lang="ts">
	import CrossButton from '$lib/Generic/CrossButton.svelte';
	import ChatWindow from './ChatWindow.svelte';
	import Preview from './Preview.svelte';
	import type {Message, PreviewMessage} from './interfaces';
	import {onMount} from 'svelte';
	import {_} from 'svelte-i18n';
	import Fa from 'svelte-fa/src/fa.svelte';
	import {faComment} from '@fortawesome/free-solid-svg-icons/faComment';
	import {fetchRequest} from '$lib/FetchRequest';
	import {type User} from '$lib/User/interfaces';
	import {chatUserStore} from './stores';

	let
		chatOpen: bool = false,
		selectedPage: 'direct'|'group' = 'direct',
		selectedChats: {direct: number|null, group: number|null},
		previewMessageLists: {
			direct: PreviewMessage[], group: PreviewMessage[]
		} = {
			direct: [], group: []
		},
		notificationLists: {direct: number[], group: number[]} = {
			direct: [], group: []
		},
		user: User,
		socket: WebSocket,
		sendMessageToSocket: (
			message: string,
			selectedChat: number,
			selectedPage: "direct"|"group"
		) => Promise<boolean>,
		isLookingAtOlderMessages: boolean = false,
		messages: Message[] = [];

	const getUser = async ()=>{
		const userBox = await chatUserStore.get();
		if (!userBox.loaded) {
			console.log("Chat failed to load the user.", userBox);
			// at this point, I'd like to set a timeout to try again (~desc)
			return;
		}
		user = userBox[0];
	};

	const setUpMessageSending = async ()=>{
		// must be imported here to avoid "document not found" error
		const {createSocket, subscribe, sendMessage} =
			(await import("./Socket")).default;
		socket = createSocket(user.id);
		sendMessageToSocket = await sendMessage(socket);
		subscribe(getMessage);
	};

	const getMessage = async e => {
	};

	onMount(async ()=>{
		await getUser();
		await setUpMessageSending();
	});
</script>

<style id="chatStyle">
	.grid-width-fix {
		grid-template-columns: 30% 70%;
		grid-template-rows: 3rem 60vh 30vh;
	}
	.small-notification:before {
		position: absolute;
		content: "";
		top: 0;
		right: 0;
		background-color: #A8F;
		border-radius: 100%;
		padding: 10px;
		z-index: 10;
	}
	.small-notification-group:after {
		position: absolute;
		content: "";
		top: 10px;
		right: 0;
		background-color: #9CE;
		border-radius: 100%;
		padding: 10px;
	}
</style>

<div id="chatPopup"
	class:invisible={!chatOpen}
	class="
		bg-white dark:bg-darkobject
		dark:darkmodeText
		fixed
		z-40 w-full
		grid grid-width-fix
	"
>
	<div class="
		col-start-2 col-end-3
		flex
		justify-between
		bg-white dark:bg-darkobject
		p-2
	">
		<div class="text-xl font-light text-gray-400">{$_("Chat")}</div>
		<div class="w-full"/>
		<div class="cursor-pointer h-full"
			on:click={()=>chatOpen = false}
			on:keypress={console.log.bind({},"CrossButton keypress")}
		>
			<CrossButton/>
		</div>
	</div>
	<Preview
		bind:selectedPage
		bind:selectedChats
		bind:previewMessageLists
		bind:notificationLists
	/>
	<ChatWindow
		bind:selectedPage
		bind:selectedChats
		bind:previewMessageLists
		bind:sendMessageToSocket
		user={user}
		bind:messages
		bind:isLookingAtOlderMessages
	/>
</div>

<div id="chatButton"
	on:click={()=>chatOpen = true}
	on:keypress={console.log.bind({}, "Chat button keypress")}
	class:small-notification={false}
	class:small-notification-group={false}
	class="
		dark:text-white
		transition-all
		fixed
		z-30
		bg-white dark:bg-darkobject
		shadow-md
		border
		p-6 bottom-6 ml-6
		rounded-full
		cursor-pointer
		hover-shadow-xl hover:border-gray-400
		active:shadow-2xl active:p-7
	"
>
	<Fa icon={faComment} size="1.3x"/>
</div>
