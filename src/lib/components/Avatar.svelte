<script lang="ts">
	interface Props {
		status: 'idle' | 'happy' | 'sad' | 'win';
		message: string;
	}
	let { status, message }: Props = $props();

	const getAnimationClass = () => {
		switch (status) {
			case 'happy':
				return 'animate-bounce';
			case 'sad':
				return 'animate-shake';
			case 'win':
				return 'animate-bounce duration-75';
			default:
				return 'animate-pulse';
		}
	};

	const getFace = () => {
		if (status === 'happy') return '😄';
		if (status === 'sad') return '😣';
		if (status === 'win') return '🥳';
		return '🤔';
	};
</script>

<div class="flex flex-col items-center justify-center space-y-4 py-6">
	<div
		class="relative bg-white text-gray-800 p-4 rounded-2xl shadow-lg border border-gray-200 max-w-xs text-center transition-all duration-300"
		class:scale-105={status === 'happy'}
		class:border-green-400={status === 'happy'}
	>
		<p class="font-medium text-lg">{message}</p>
		<div
			class="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-b border-r border-gray-200"
		></div>
	</div>
	<div
		class="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-xl border-4 border-white {getAnimationClass()}"
	>
		<div class="text-4xl">{getFace()}</div>
	</div>
</div>

<style>
	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-6px);
		}
		75% {
			transform: translateX(6px);
		}
	}
	.animate-shake {
		animation: shake 0.2s ease-in-out 2;
	}
</style>
