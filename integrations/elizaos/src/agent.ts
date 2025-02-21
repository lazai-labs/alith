import {
	AgentRuntime,
	CacheManager,
	type Content,
	type Memory,
	MemoryCacheAdapter,
	ModelProviderName,
	type Plugin,
	type State,
	elizaLogger,
	settings,
	stringToUuid,
} from "@elizaos/core";
import {
	Agent as BaseAgent,
	type AgentOptions as BaseAgentOptions,
} from "alith";
import { convertPluginsToTools } from "./converter";

export type AgentOptions = BaseAgentOptions & {
	provider: ModelProviderName;
	plugins?: Plugin[];
};

export class Agent extends BaseAgent {
	private _provider: ModelProviderName;

	public constructor(opts: AgentOptions) {
		const tools = opts.tools ?? [];
		for (const tool of convertPluginsToTools(
			opts.provider,
			opts.plugins ?? [],
		)) {
			tools.push(tool);
		}
		ElizaOSAgentRuntime.createOrGet(opts.provider);
		super({
			name: opts.name,
			model: opts.model,
			preamble: opts.preamble,
			base_url: opts.base_url,
			api_key: opts.api_key,
			tools: tools,
		});
		this._provider = opts.provider;
	}
	/**
	 * Processes a prompt using the agent's tools and model.
	 * @param {string} prompt - The input prompt to process.
	 * @returns {string} - The result of processing the prompt.
	 */
	public prompt(prompt: string): string {
		ElizaOSAgentRuntime.updateMemoryAndState(this._provider, prompt).then(
			(_) => {
				return super.prompt(prompt);
			},
		);
		return super.prompt(prompt);
	}
}

export class ElizaOSAgentRuntime {
	private static runtime: AgentRuntime | null = null;
	private static memory: Memory | null = null;
	private static state: State | null = null;

	private constructor(private _provider: ModelProviderName) {}

	public static createOrGet(provider: ModelProviderName): AgentRuntime {
		if (!ElizaOSAgentRuntime.runtime) {
			ElizaOSAgentRuntime.runtime = new AgentRuntime({
				token: getTokenForProvider(provider),
				databaseAdapter: null,
				cacheManager: new CacheManager(new MemoryCacheAdapter()),
				modelProvider: provider,
			});
			ElizaOSAgentRuntime.runtime.initialize();
		}
		return ElizaOSAgentRuntime.runtime;
	}

	public static getMemoryAndState(
		provider: ModelProviderName,
	): [Memory | null, State | null] {
		return [ElizaOSAgentRuntime.memory, ElizaOSAgentRuntime.state];
	}

	public static async updateMemoryAndState(
		provider: ModelProviderName,
		prompt: string,
	): Promise<void> {
		const [memory, state] = await ElizaOSAgentRuntime.memoryAndStateFromText(
			provider,
			prompt,
		);
		ElizaOSAgentRuntime.memory = memory;
		ElizaOSAgentRuntime.state = state;
	}

	private static async memoryAndStateFromText(
		provider: ModelProviderName,
		text: string,
	): Promise<[Memory, State]> {
		const runtime = ElizaOSAgentRuntime.createOrGet(provider);
		const content: Content = {
			text,
			source: "alith",
			inReplyTo: undefined,
		};
		const userId = stringToUuid("alith");
		const userMessage = {
			content,
			userId,
			roomId: userId,
			agentId: runtime.agentId,
		};
		const memory = {
			...userMessage,
			agentId: runtime.agentId,
			content,
			createdAt: Date.now(),
		};
		const state = await runtime.composeState(userMessage, {
			agentName: "alith",
		});
		return [memory, state];
	}
}

export function getTokenForProvider(
	provider: ModelProviderName,
): string | undefined {
	switch (provider) {
		case ModelProviderName.OPENAI:
			return settings.OPENAI_API_KEY;
		case ModelProviderName.CLAUDE_VERTEX:
		case ModelProviderName.ANTHROPIC:
			return settings.ANTHROPIC_API_KEY || settings.CLAUDE_API_KEY;
		case ModelProviderName.GROK:
			return settings.GROK_API_KEY;
		case ModelProviderName.GOOGLE:
			return settings.GOOGLE_GENERATIVE_AI_API_KEY;
		case ModelProviderName.MISTRAL:
			return settings.MISTRAL_API_KEY;
		case ModelProviderName.DEEPSEEK:
			return settings.DEEPSEEK_API_KEY;
		default: {
			const errorMessage = `Failed to get token - unsupported model provider in Alith: ${provider}`;
			elizaLogger.error(errorMessage);
			throw new Error(errorMessage);
		}
	}
}
