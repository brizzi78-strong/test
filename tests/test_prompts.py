from ghostwriter.prompts import TASKS


def test_all_tasks_have_persona_and_builder():
    assert set(TASKS) == {"draft", "rewrite", "expand", "continue", "outline"}
    for task in TASKS.values():
        assert task.system
        assert callable(task.build_user)


def test_style_clause_included_when_options_given():
    user = TASKS["draft"].build_user(
        "A post about gardening", tone="warm", audience="beginners", words=300
    )
    assert "A post about gardening" in user
    assert "warm tone" in user
    assert "beginners" in user
    assert "300 words" in user


def test_style_clause_omitted_when_no_options():
    user = TASKS["rewrite"].build_user("Some text")
    assert user.strip().endswith("Some text")


def test_continue_asks_only_for_continuation():
    user = TASKS["continue"].build_user("Once upon a time")
    assert "only the continuation" in user.lower()
