export class Game {
	target: string;
	traits: string[];
	guesses: string[];
	foundTraits: string[];
	gameState: 'playing' | 'won' | 'lost';

	constructor(target: string, traits: string[], serialized?: string) {
		this.target = target;
		this.traits = traits;
		
		if (serialized) {
			const [guessesStr, foundTraitsStr, gameState] = serialized.split('|');
			this.guesses = guessesStr ? guessesStr.split(',') : [];
			this.foundTraits = foundTraitsStr ? foundTraitsStr.split(',') : [];
			this.gameState = (gameState as 'playing' | 'won' | 'lost') || 'playing';
		} else {
			this.guesses = [];
			this.foundTraits = [];
			this.gameState = 'playing';
		}
	}

	/**
	 * Check a guess against the target word and traits
	 * Returns 'win', 'trait', or 'miss'
	 */
	checkGuess(guess: string): 'win' | 'trait' | 'miss' {
		const normalizedGuess = guess.trim().toLowerCase();
		const normalizedTarget = this.target.toLowerCase();
		
		// Check for exact match (win)
		if (normalizedGuess === normalizedTarget) {
			this.gameState = 'won';
			return 'win';
		}

		// Check for trait match
		const isTrait = this.traits.some(t => t.toLowerCase() === normalizedGuess);
		if (isTrait && !this.foundTraits.includes(normalizedGuess)) {
			// Create new array reference for Svelte reactivity
			this.foundTraits = [...this.foundTraits, normalizedGuess];
			return 'trait';
		}

		return 'miss';
	}

	/**
	 * Add a guess to the guesses array
	 */
	addGuess(guess: string) {
		const normalizedGuess = guess.trim().toLowerCase();
		if (!this.guesses.includes(normalizedGuess)) {
			// Create new array reference for Svelte reactivity
			this.guesses = [...this.guesses, normalizedGuess];
		}
	}

	/**
	 * Check if game should end due to max guesses
	 */
	checkGameOver(maxGuesses: number): boolean {
		if (this.guesses.length >= maxGuesses && this.gameState === 'playing') {
			this.gameState = 'lost';
			return true;
		}
		return false;
	}

	/**
	 * Serialize game state for storage
	 */
	toString(): string {
		return `${this.guesses.join(',')}|${this.foundTraits.join(',')}|${this.gameState}`;
	}
}
