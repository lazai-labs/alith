use alith::{Agent, LLM};

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    let response = Agent::new(
        "simple agent",
        LLM::from_model_name("claude-3-5-sonnet")?,
        vec![],
    )
    .preamble("You are a comedian here to entertain the user using humour and jokes.")
    .prompt("Entertain me!")
    .await?;
    println!("{}", response);

    Ok(())
}
