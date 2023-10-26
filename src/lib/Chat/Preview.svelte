<script lang="ts">
	import type {Group} from "$lib/Group/interface";
	import type {User} from "$lib/User/interfaces";
	import {
		setTimeStamp,
		type Direct,
		type Message,
		type PreviewMessage
	} from "./interfaces";
	import {fetchRequest} from "$lib/FetchRequest";
	import Tab from "$lib/Generic/Tab.svelte";
	import TextInput from "$lib/Generic/TextInput.svelte";
	import ProfilePicture from "$lib/Generic/ProfilePicture.svelte";
	import {onMount} from "svelte";
	import {
		chatUserStore,
		chatUsersStore,
		chatGroupsStore
	} from "$lib/Chat/stores";

	let
		user: User,
		directs: any[] = [],
		groups: Group[] = [],
		chatSearch = "";

	export let
		selectedPage: "direct"|"group" = "direct",
		selectedChats: {direct: number|null, group: number|null} = {
			direct: null, group: null
		},
		// previewDirect and previewGroup
		previewMessageLists: {
			direct: PreviewMessage[], group: PreviewMessage[]
		} = {
			direct: [], group: []
		},
		// notifiedDirect and notifiedGroup
		notificationLists: {direct: number[], group: number[]} = {
			direct: [], group: []
		};

	/* trigger any reactivity stuff associated with a variable */
	const notice = x => x = x;

	onMount(async ()=>{
		user = (await chatUserStore.get())[0];
		await getChatters();
		await setUpPreview();
	});

	const getChatters = async ()=>{
		if (directs.length || groups.length)
			return;
		[directs, groups] = await Promise.all([
			chatUsersStore.get().then(x => x.filter(y => y.id !== user.id)),
			chatGroupsStore.get()
		]);
	};

	const setUpPreview = ()=>
		Promise.all(["direct", "group"].map(page =>
			fetchPreview(page).then(x => {
				previewMessageLists[page] = x;
				notificationLists[page] = notificationsForPreview(x);
			})
		));

	const fetchPreview = async (page: "direct"|"group") => {
		const {res, json} = await fetchRequest("GET",
			`chat/${page}/preview?order_by=created_at_desc`
		);
		if (!res.ok)
			return;
		return json.results;
	};

	const notificationsForPreview = (x: any[]) =>
		x.filter(msg =>
			msg.timestamp < msg.created_at
		).map(msg =>
			msg.group_id ?
				msg.group_id :
			msg.target_id === user.id ?
				msg.user_id :
				msg.target_id
		);

	const clickOnChatter = x =>{
		// clear any existing notification on the newly selected chatter
		previewMessageLists[selectedPage].filter(
			selectedPage === "direct" ?
				msg =>
					msg.target_id === selectedChats.direct ||
					msg.user_id === selectedChats.direct
			: selectedPage === "group" ?
				msg =>
					msg.group_id === selectedChats.group
			: false
		).forEach(msg =>
			msg.timestamp = new Date().toString()
		);
		previewMessageLists[selectedPage] = previewMessageLists[selectedPage];
		// switch the chat shown on the right to the newly selected chatter
		if (selectedChats[selectedPage] !== x.id)
			selectedChats[selectedPage] = x.id;
		// update the time stamp
		setTimeStamp(x.id, selectedPage);
	};

	const latestMessageFrom = x => (
		previewMessageLists[selectedPage].find(
			selectedPage === "direct" ? msg =>
				msg.user_id === x.id &&
				msg.target_id !== user.id ||
				msg.user_id !== user.id &&
				msg.target_id === x.id :
			selectedPage === "group" ? msg =>
				msg.group_id === x.id :
			false
		)?.message || ""
	);

	$: if (user)
		notify(user, previewMessageLists.direct);
	const notify = async (user, previewMessages) => {
		const shortList = previewMessages.filter(x =>
			(!x.timestamp || x.timestamp <= x.created_at) &&
			x.user_id !== user.id && (
				selectedPage === "group" ||
				selectedPage === "direct" &&
				x.targetId !== selectdChats.direct &&
				x.user_id !== selectedChats.direct
			)
		);
		// if the messager is unknown, update the chatter list
		if (directs.every(direct => shortList.every(x =>
			direct.id !== x.user_id && direct.id !== x.target_id
		)))
			await getChatters();
		// now update the notifications list
		notificationLists.direct = shortList.filter(x =>
			directs.some(direct =>
				direct.id === x.user_id || direct.id === x.target_id
			)
		).map(x =>
			x.target_id === user.id ?
				x.user_id :
				x.target_id
		);
	};

	$: sortChats();
	const sortChats = () => {
		sortChat(directs, previewMessageLists.direct);
		notice(directs);

		sortChat(groups, previewMessageLists.group);
		notice(groups);
	};

	const sortChat = (chatters: Direct[]|Group[], previews: PreviewMessage[])=>{
		if (!user)
			return;
		const isPreviewOf = (p, z) =>
			p.target_id === z.id || p.user_id === z.id ?
				p.group_id !== z.id :
				p.group_id === z.id;
		chatters.sort((x, y) => {
			const px = previews.find(p => isPreviewOf(p, x));
			const py = previews.find(p => isPreviewOf(p, y));
			return px && !py ?
				-1 :
			!px && !py ?
				0 :
			!px && py ?
				1 :
			px && py ?
				new Date(px.created_at) - new Date(py.created_at) :
				1;
		});
	};

	$: updateNotificationsFromGroup();
	const updateNotificationsFromGroup = () => {
		if (!user)
			return;
		notificationLists.group = previewMessageLists.group
			.filter(x =>
				x.timestamp < x.created_at && x.group_id !== selectedChats.group			).map(x =>
				x.group_id
			);
	};
</script>

<style>
	.group-message-bg {
		background: linear-gradient(90deg, #FFFF 32%, #BCFF 76%);
	}
	.direct-message-bg {
		background: linear-gradient(90deg, #EDF 32%, #FFF 76%);
	}
	.both-message-bg {
		background: linear-gradient(90deg, #EDF 32%, #BCFF 76%);
	}
</style>

<div
	class={`
		col-start-1 col-end-2
		row-start-1 row-end-2
		${
			notificationLists.direct.length && notificationLists.group.length ?
				"both-message-bg" :
			notificationLists.direct.length ?
				"direct-message-bg" :
			notificationLists.group.length ?
				"group-message-bg" :
			""
		}
	`}
>
	<Tab
		Class=""
		bind:selectedPage
		tabs={["direct", "group"]}
		displayNames={["Direct", "Groups"]}
	/>
</div>

<ul class="
	row-start-2 row-end-4
	flex flex-col
	sm:h-[30-vh]
	md:h-[80vh]
	lg:h-[90vh]
	overflow-y-scroll
">
	<TextInput
		label={`Search ${selectedPage === "direct" ? "users" : "groups"}`}
		bind:value={chatSearch}
		Class="
			w-full
			mt-1
			m1-2
			mb-2
		"
	/>
	{#each selectedPage === "direct" ? directs : groups as chatter}
		<li
			class:hidden={
				!chatter[
					selectedPage === "direct" ? "username" : "name"
				].toLowerCase().includes(chatSearch.toLowerCase())
			}
			class="
				transition transition-color
				p-3
				flex
				items-center
				gap-3
				hover:bg-gray-200
				active:bg-gray-500
				cursor-pointer
			"
			class:bg-gray-200={selectedChats[selectedPage] === chatter.id}
			on:click={async ()=>{
				clickOnChatter(chatter)
			}}
			on:keypress={(console.log.bind("", "chatter keypress"))}
		>
			{#if (notificationLists[selectedPage]).includes(chatter.id)}
				<div
					class="p-1 rounded-full"
					class:bg-purple-400={selectedPage === "direct"}
					class:bg-blue-300={selectedPage === "group"}
				/>
			{/if}
			<ProfilePicture user={chatter}/>
			<div class="flex flex-col">
				<span class="
					max-w-[12vw]
					overflow-x-hidden overflow-ellipsis
				">{chatter.name || chatter.username}</span>
				<span class="
					text-gray-400 text-sm
					truncate
					h-[20px]
					overflow-x-hidden
					max-w-[10vw]
				">{latestMessageFrom(chatter)}</span>
			</div>
		</li>
	{/each}
</ul>
