import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import useThemeContext from "@theme/hooks/useThemeContext";
import classnames from "classnames";
import Clipboard from "clipboard";
import rangeParser from "parse-numeric-range";
import Highlight, { defaultProps } from "prism-react-renderer";
import defaultTheme from "prism-react-renderer/themes/palenight";
import React, { useEffect, useRef, useState } from "react";
import { getPlaygroundUrlForCode } from "../../pages/play/code";
import styles from "./styles.module.scss";

function useClipboard() {
    const target = useRef(null);
    const button = useRef(null);

    const [showCopied, setShowCopied] = useState(false);
    useEffect(() => {
        let clipboard;

        if (button.current) {
            clipboard = new Clipboard(button.current, {
                target: () => target.current,
            });
        }

        return () => {
            if (clipboard) {
                clipboard.destroy();
            }
        };
    }, [button.current, target.current]);

    const handleCopyCode = () => {
        window.getSelection().empty();
        setShowCopied(true);

        setTimeout(() => setShowCopied(false), 2000);
    };

    return { showCopied, handleCopyCode, target, button };
}

function usePrismTheme(prism) {
    const [mounted, setMounted] = useState(false);
    // The Prism theme on SSR is always the default theme but the site theme
    // can be in a different mode. React hydration doesn't update DOM styles
    // that come from SSR. Hence force a re-render after mounting to apply the
    // current relevant styles. There will be a flash seen of the original
    // styles seen using this current approach but that's probably ok. Fixing
    // the flash will require changing the theming approach and is not worth it
    // at this point.
    useEffect(() => {
        setMounted(true);
    }, []);

    const { isDarkTheme } = useThemeContext();
    const lightModeTheme = prism.theme || defaultTheme;
    const darkModeTheme = prism.darkTheme || lightModeTheme;
    const prismTheme = isDarkTheme ? darkModeTheme : lightModeTheme;
    return { prismTheme, mounted };
}

export default ({ children, className: languageClassName, metastring = "" }) => {
    const {
        siteConfig: {
            themeConfig: { prism = {} },
        },
    } = useDocusaurusContext();

    const { prismTheme, mounted } = usePrismTheme(prism);
    const { showCopied, handleCopyCode, target, button } = useClipboard();

    const code = children.trim();
    const [, title] = metastring.match(/title=(.+)( |$)/) ?? [];

    const [, highlightLinesRange] = metastring.match(/{([\d,-]+)}/) ?? [];
    const highlightLines =
        highlightLinesRange != null ? rangeParser.parse(highlightLinesRange).filter((n) => n > 0) : [];

    let language = languageClassName && languageClassName.replace(/language-/, "");
    if (!language && prism.defaultLanguage) {
        language = prism.defaultLanguage;
    }

    const hasPlayground = language === "ts" || language === "typescript";

    return (
        <Highlight {...defaultProps} key={mounted} theme={prismTheme} code={code} language={language}>
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
                <>
                    {title && <div className={styles.title}>{title}</div>}
                    <pre className={classnames(className, styles.codeBlock, title && styles.hasTitle)}>
                        <button
                            ref={button}
                            type="button"
                            aria-label="Copy code to clipboard"
                            className={styles.copyButton}
                            onClick={handleCopyCode}
                        >
                            {showCopied ? "Copied" : "Copy"}
                        </button>

                        {hasPlayground && (
                            <Link
                                aria-label="Open code on playground"
                                className={styles.playgroundButton}
                                to={getPlaygroundUrlForCode(code)}
                                target="_blank"
                            >
                                Playground
                            </Link>
                        )}

                        <code ref={target} className={styles.codeBlockLines} style={style}>
                            {tokens.map((line, i) => {
                                if (line.length === 1 && line[0].content === "") {
                                    line[0].content = "\n";
                                }

                                const lineProps = getLineProps({ line, key: i });

                                if (highlightLines.includes(i + 1)) {
                                    lineProps.className = `${lineProps.className} docusaurus-highlight-code-line`;
                                }

                                return (
                                    <div key={i} {...lineProps}>
                                        {line.map((token, key) => (
                                            <span key={key} {...getTokenProps({ token, key })} />
                                        ))}
                                    </div>
                                );
                            })}
                        </code>
                    </pre>
                </>
            )}
        </Highlight>
    );
};
