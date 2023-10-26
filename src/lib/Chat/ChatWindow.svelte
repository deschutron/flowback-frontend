<script lang="ts">
	import {_} from "svelte-i18n";
	import {
		setTimeStamp,
		type Message,
		type PreviewMessage,
		type User
	} from "./interfaces";
	import Button from "$lib/Generic/Button.svelte";
	import {fetchRequest} from "$lib/FetchRequest";
	import {formatDate} from "$lib/Generic/DateFormatter";
	import {browser} from "$app/environment";
	import TextArea from "$lib/Generic/TextArea.svelte";
	import Fa from "svelte-fa/src/fa.svelte";
	import {faPaperPlane} from "@fortawesome/free-solid-svg-icons/faPaperPlane";
	import {faSmile} from "@fortawesome/free-solid-svg-icons/faSmile";
	import StatusMessage from "$lib/Generic/StatusMessage.svelte";
	const {statusMessageFormatter} = StatusMessage;

	const sleep = duri => prior =>
		new Promise(res => setTimeout(res, duri, prior));
	
	let
		message: string = import.meta.env.VITE_MODE === "DEV" ? "a" : "",
		olderMessages: string = undefined,
		newerMessages: string = "ninit",
		showEmoji: bool = false,
		status: {
			message,
			success: boolean
		};

	export let
		selectedPage: "direct"|"group" = "direct",
		selectedChats: {
			direct: number|null,
			group: number|null
		} = {direct: null, group: null},
		sendMessageToSocket: (
			message: string,
			selectedChat: number,
			selectedPage: "direct"|"group"
		) => Promise<boolean>,
		user: User,
		messages: Message[] = [],
		previewMessageLists: {
			direct: PreviewMessage[],
			group: PreviewMessage[]
		},
		isLookingAtOlderMessages: boolean;

	$: selectedPage && getRecentMessages();

	// When messages are received and not looking at history, scroll.
	$: messages && (
		async () => {
			if (newerMessages) return;
			if (!browser) return;
			await sleep(100);
			const dQs = document.querySelector.bind(document);
			dQs("#chat-window")?.scroll(0, 100000);
		}
	)();

	const getRecentMessages = async () => {
		if (!selectedChats[selectedPage])
			return;
		const {res, json} = await fetchRequest("GET",
			`chat/${selectedPage}/${selectedChats[selectedPage]}?` +
			`order_by=created_at_desc&limit=${25}`
		);
		if (!res.ok || !json || !json.results) {
			console.err("chat GET failed.", res, json);
			messages = [];
			olderMessages = undefined;
			newerMessages = undefined;
			return;
		}
		messages = json.results.reverse();
		olderMessages = json.next;
		newerMessages = null;
	};

	const showOlderMessages = async () => {
		const {res, json} = await fetchRequest("GET", olderMessages);
		if (!res.ok || !json.results)
			return;
		newerMessages = json.previous;
		olderMessages = json.next;
		messages = json.results.reverse;
	}

	$: {
		isLookingAtOlderMessages = !!newerMessages;
	}

	const updatePreviewWindow = async () => {
		const previewMessage = previewMessageLists[selectedPage].find(x =>
			(selectedPage === "direct" &&
				x.user_id === user.id && x.target_id === selectedChats.direct ||
				x.target_id === user.id && x.user_id === selectedChats.direct
			) ||
			selectedPage === "group" && x.group_id === selectedChats.group
		);
		if (previewMessage) {
			previewMessage.message = message;
			previewMessage.created_at = new Date().toString();
			return;
		}
		// for brand new chats, create a new preview message
		previewMessageLists[selectedPage].push({
			created_at: new Date().toString(),
			message,
			timestamp: new Date().toString(),
			username: user.username,
			user_id: user_id,
			target_id: selectedPage === "direct" ? selectedChats.direct : 0,
			// why is target_username user.username?
			target_username: user.username,
			profile_image: "",
			group_id: selectedPage === "group" ? selectedChats.group : 0
		});
	};

	const postMessage = async () => {
		if (
			!message.length || !selectedChats[selectedPage] ||
			// if only spaces, return
			message.match(/^\s+$/)
		)
			return;
		// when sending, go to most recent messages
		if (newerMessages)
			getRecentMessages();
		updatePreviewWindow();
		// ring the bell (trigger reactive declarations)
		previewMessageLists[selectedPage] = previewMessageLists[selectedPage];
		const didSend = await sendMessageToSocket(
				message, selectedChat[selectedPage], selectedPage);
		if (!didSend)
			status = {message: "Could not send message", success: false};
		else
			messages.push({
				message,
				user: {
					username: user.username,
					id: user.id,
					profile_image: user.profile_image || ""
				}
			});
		messages = messages;
		message = import.meta.env.VITE_MODE === 'DEV' ? message + "a" : "";
		setTimeStamp(selectedChats[selectedPage], selectedPage);
	}
</script>

{#if selectedChats[selectedPage] === null}
	<div>{$_("No chat selected")}</div>
{:else}
	<ul id="chat-window"
		class="
			col-start2 col-end-3
		"
	>
		{#if !messages.length}
			<span class="self-center">{$_(
				"Chat is currently empty, maybe say hello?"
			)}</span>
		{/if}
		{#if olderMessages}
			<li class="text-counter mt- mb-6">
				<Button action={showOlderMessages}>{
					$_("Show older messages")
				}</Button>
		{/if}
		{#each messages as message}
			<li class="p-3 hover:bg-gray-200">
				<span>{message.user?.username || message.username}</span>
				<span class="
					text-[14px] text-gray-400 ml-3
				">{
					formatDate(message.created_at)
				}</span>
				<p>{message.message}</p>
			</li>
		{/each}
		<StatusMessage bind:status disableSuccess/>
	</ul>

	<div id="chat-message-write-div" class="
		bg-white dark:bg-darkobject
		col-start-2 col-end-3
		shadow rounded
		p-2 w-full
	">
		<form
			class="w-full flex gap-2 md:mt-2 lg:mt-5 xl:mt-14 items-center"
			on:submit|preventDefault={postMessage}
		>
			<TextArea
				autofocus label="" required max={3000} bind:value={message}
				Class="w-full"
				onKeyPress={e => {
					if (e.key === "Enter" && !e.shiftKey) {
						postMessage();
						e.preventDefault();
					}
				}}
			/>
			{#if import.meta.env.VITE_MODE === "DEV"}
				<Button
					action={() => showEmoji = !showEmoji}
					Class="rounded-full pl-3 pr-3 pt-3 pb-3 h-1/2"
				>
					<Fa icon={faSmile}/>
				</Button>
			{/if}
			<Button type="submit" Class="rounded-full pl-3 pr-3 pt-3 pb-3 h-1/2">
				<Fa icon={faPaperPlane}/>
			</Button>
		</form>
	</div>
{/if}
