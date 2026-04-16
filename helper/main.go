package main

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/go-vgo/robotgo"
)

const (
	defaultStepGapMs   = 180
	comboSettleMs      = 160
	keyPressSettleMs   = 90
	textLineDelayMs    = 24
	textLineBreakMs    = 60
	textSubmitSettleMs = 220
)

type Step struct {
	Type       string   `json:"type"`
	Keys       []string `json:"keys"`
	Key        string   `json:"key"`
	Modifiers  []string `json:"modifiers"`
	Value      string   `json:"value"`
	DurationMs int      `json:"durationMs"`
	Count      int      `json:"count"`
}

var modifierMap = map[string]string{
	"cmd":     "cmd",
	"command": "cmd",
	"meta":    "cmd",
	"win":     "cmd",
	"control": "ctrl",
	"ctrl":    "ctrl",
	"option":  "alt",
	"alt":     "alt",
	"shift":   "shift",
}

var keyMap = map[string]string{
	"return":      "enter",
	"enter":       "enter",
	"tab":         "tab",
	"delete":      "delete",
	"backspace":   "backspace",
	"escape":      "escape",
	"esc":         "escape",
	"space":       "space",
	"spacebar":    "space",
	"arrowleft":   "left",
	"arrowright":  "right",
	"arrowup":     "up",
	"arrowdown":   "down",
	"home":        "home",
	"end":         "end",
	"pageup":      "pageup",
	"pagedown":    "pagedown",
	"[":           "[",
	"]":           "]",
	"=":           "=",
	",":           ",",
	".":           ".",
	"_":           "-",
	"f1":          "f1", "f2": "f2", "f3": "f3", "f4": "f4",
	"f5": "f5", "f6": "f6", "f7": "f7", "f8": "f8",
	"f9": "f9", "f10": "f10", "f11": "f11", "f12": "f12",
}

var modifierOrder = map[string]int{
	"cmd":   0,
	"ctrl":  1,
	"alt":   2,
	"shift": 3,
}

func isModifier(key string) bool {
	_, ok := modifierOrder[key]
	return ok
}

func normaliseKey(token string) string {
	key := strings.ToLower(strings.TrimSpace(token))
	if mapped, ok := keyMap[key]; ok {
		return mapped
	}
	return key
}

func parseCombo(keys []string) ([]string, error) {
	if len(keys) == 0 {
		return nil, fmt.Errorf("empty key combo")
	}

	chord := []string{}
	seen := map[string]bool{}
	primaryCount := 0

	for _, raw := range keys {
		token := strings.ToLower(strings.TrimSpace(raw))
		if token == "" {
			continue
		}
		if mapped, ok := modifierMap[token]; ok {
			token = mapped
		} else {
			token = normaliseKey(token)
		}
		if token == "" || seen[token] {
			continue
		}
		seen[token] = true
		if !isModifier(token) {
			primaryCount++
		}
		chord = append(chord, token)
	}

	if len(chord) == 0 {
		return nil, fmt.Errorf("key combo missing keys")
	}
	if primaryCount == 0 {
		return nil, fmt.Errorf("key combo needs one non-modifier key")
	}
	if primaryCount > 1 {
		return nil, fmt.Errorf("key combo can only use one non-modifier key")
	}

	modifiers := []string{}
	primary := ""
	for _, token := range chord {
		if isModifier(token) {
			modifiers = append(modifiers, token)
			continue
		}
		primary = token
	}
	sort.SliceStable(modifiers, func(i, j int) bool {
		return modifierOrder[modifiers[i]] < modifierOrder[modifiers[j]]
	})

	return append(modifiers, primary), nil
}

func executeChord(keys []string) error {
	chord, err := parseCombo(keys)
	if err != nil {
		return err
	}

	modifiers := []string{}
	primaryKeys := []string{}

	for _, key := range chord {
		if isModifier(key) {
			modifiers = append(modifiers, key)
			continue
		}
		primaryKeys = append(primaryKeys, key)
	}

	if len(primaryKeys) != 1 {
		return fmt.Errorf("key combo replay requires one primary key")
	}
	for _, modifier := range modifiers {
		if err := robotgo.KeyDown(modifier); err != nil {
			return fmt.Errorf("failed to press modifier %s: %w", modifier, err)
		}
	}
	time.Sleep(25 * time.Millisecond)
	if err := robotgo.KeyTap(primaryKeys[0]); err != nil {
		return fmt.Errorf("failed to tap key %s: %w", primaryKeys[0], err)
	}
	time.Sleep(25 * time.Millisecond)
	for index := len(modifiers) - 1; index >= 0; index -= 1 {
		if err := robotgo.KeyUp(modifiers[index]); err != nil {
			return fmt.Errorf("failed to release modifier %s: %w", modifiers[index], err)
		}
	}

	time.Sleep(comboSettleMs * time.Millisecond)

	return nil
}

func executeStep(step Step) error {
	switch step.Type {
	case "keyCombo":
		return executeChord(step.Keys)
	case "keyPress":
		key := normaliseKey(step.Key)
		if key == "" {
			return fmt.Errorf("key press missing key")
		}
		chord := append([]string{}, step.Modifiers...)
		chord = append(chord, step.Key)
		if err := executeChord(chord); err != nil {
			return err
		}
		time.Sleep(keyPressSettleMs * time.Millisecond)
		return nil
	case "text":
		if strings.TrimSpace(step.Value) == "" {
			return fmt.Errorf("text step cannot be empty")
		}
		textValue := strings.ReplaceAll(step.Value, "\r\n", "\n")
		lines := strings.Split(textValue, "\n")
		for index, line := range lines {
			if line != "" {
				robotgo.TypeStr(line, 0, textLineDelayMs, textLineDelayMs)
			}
			if index < len(lines)-1 {
				time.Sleep(textLineBreakMs * time.Millisecond)
				robotgo.KeyTap("enter")
				time.Sleep(textLineBreakMs * time.Millisecond)
			}
		}
		time.Sleep(textSubmitSettleMs * time.Millisecond)
		return nil
	case "delay":
		if step.DurationMs < 50 || step.DurationMs > 2000 {
			return fmt.Errorf("delay out of range: %d", step.DurationMs)
		}
		time.Sleep(time.Duration(step.DurationMs) * time.Millisecond)
		return nil
	case "repeatKeyPress":
		key := normaliseKey(step.Key)
		if key == "" {
			return fmt.Errorf("repeat key press missing key")
		}
		if step.Count < 1 || step.Count > 10 {
			return fmt.Errorf("repeat count out of range: %d", step.Count)
		}
		for i := 0; i < step.Count; i++ {
			robotgo.KeyTap(key)
			time.Sleep(30 * time.Millisecond)
		}
		return nil
	default:
		return fmt.Errorf("unsupported step type: %s", step.Type)
	}
}

func main() {
	if len(os.Args) < 4 {
		fmt.Println("usage: shortcut-helper <app> <buttonId> <stepsJson>")
		os.Exit(1)
	}

	app := strings.ToLower(os.Args[1])
	buttonID := strings.ToLower(os.Args[2])
	rawSteps := os.Args[3]

	steps := []Step{}
	if err := json.Unmarshal([]byte(rawSteps), &steps); err != nil {
		fmt.Printf("ERROR: invalid steps payload: %v\n", err)
		os.Exit(1)
	}

	if len(steps) == 0 {
		fmt.Println("ERROR: no steps provided")
		os.Exit(1)
	}

	fmt.Printf("HELPER executing -> app: %s, button: %s, steps: %s\n", app, buttonID, strconv.Itoa(len(steps)))
	for index, step := range steps {
		fmt.Printf("HELPER step %d -> type=%s keys=%v key=%s value=%q durationMs=%d count=%d\n",
			index+1,
			step.Type,
			step.Keys,
			step.Key,
			step.Value,
			step.DurationMs,
			step.Count,
		)
	}
	robotgo.KeySleep = 18
	time.Sleep(50 * time.Millisecond)

	for index, step := range steps {
		if err := executeStep(step); err != nil {
			fmt.Printf("ERROR: step %d failed: %v\n", index+1, err)
			os.Exit(1)
		}
		if index < len(steps)-1 {
			time.Sleep(defaultStepGapMs * time.Millisecond)
		}
	}
}
