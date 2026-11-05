import Image from "next/image"
import { CHROME_STORE_URL } from "@/lib/extension"

export function InstallButton({ className = "" }: { className?: string }) {
  return <a className={`btn btn-primary install-button ${className}`} href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer"><Image src="/browser/chrome.svg" width={24} height={24} alt="" aria-hidden="true" unoptimized /><span>Add to Chrome</span></a>
}
