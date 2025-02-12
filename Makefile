build:
	cargo build -r

check:
	cargo check -r --all

test:
	cargo test -r --workspace --all-features

accept:
	cargo insta accept --all

fmt:
	cargo fmt --all

clippy:
	cargo clippy --workspace --all-features --benches --examples --tests -- -D warnings

fix:
	cargo clippy --workspace --all-features --benches --examples --tests --fix --allow-dirty
