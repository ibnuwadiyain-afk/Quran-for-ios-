import Foundation
import AVFoundation
import MediaPlayer

final class AudioPlayer {
    static let shared = AudioPlayer()
    private var player: AVPlayer?
    private var downloadTask: URLSessionDownloadTask?
    private var currentTitle: String = "The Holy Quran"

    private init() {
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [])
        try? AVAudioSession.sharedInstance().setActive(true)
        configureRemoteCommands()
    }

    private func configureRemoteCommands() {
        let center = MPRemoteCommandCenter.shared()
        center.playCommand.isEnabled = true
        center.playCommand.addTarget { [weak self] _ in
            guard let self = self, let player = self.player else { return .commandFailed }
            player.play()
            self.updateNowPlaying(isPlaying: true)
            return .success
        }
        center.pauseCommand.isEnabled = true
        center.pauseCommand.addTarget { [weak self] _ in
            guard let self = self, let player = self.player else { return .commandFailed }
            player.pause()
            self.updateNowPlaying(isPlaying: false)
            return .success
        }
        center.togglePlayPauseCommand.isEnabled = true
        center.togglePlayPauseCommand.addTarget { [weak self] _ in
            guard let self = self else { return .commandFailed }
            self.toggle()
            return .success
        }
    }

    func play(_ url: URL, title: String = "Quran Recitation") {
        player?.pause()
        currentTitle = title
        player = AVPlayer(url: url)
        player?.play()
        updateNowPlaying(isPlaying: true)
    }

    func toggle() {
        guard let player = player else { return }
        if player.timeControlStatus == .playing {
            player.pause()
            updateNowPlaying(isPlaying: false)
        } else {
            player.play()
            updateNowPlaying(isPlaying: true)
        }
    }

    func stop() {
        player?.pause()
        player = nil
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    }

    private func updateNowPlaying(isPlaying: Bool) {
        var info = [String: Any]()
        info[MPMediaItemPropertyTitle] = currentTitle
        info[MPMediaItemPropertyArtist] = "Quran Reader"
        info[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? 1.0 : 0.0
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }

    func download(_ url: URL, chapterID: Int, completion: @escaping (Result<URL, Error>) -> Void) {
        downloadTask?.cancel()
        downloadTask = URLSession.shared.downloadTask(with: url) { temp, _, error in
            if let error = error { DispatchQueue.main.async { completion(.failure(error)) }; return }
            guard let temp = temp else { DispatchQueue.main.async { completion(.failure(APIError.server)) }; return }
            let folder = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("Recitations", isDirectory: true)
            try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true, attributes: nil)
            let destination = folder.appendingPathComponent("chapter-\(chapterID)-reciter-\(AppSettings.reciterID).mp3")
            try? FileManager.default.removeItem(at: destination)
            do {
                try FileManager.default.moveItem(at: temp, to: destination)
                DispatchQueue.main.async { completion(.success(destination)) }
            } catch { DispatchQueue.main.async { completion(.failure(error)) } }
        }
        downloadTask?.resume()
    }

    func downloadedURL(chapterID: Int) -> URL? {
        let url = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("Recitations/chapter-\(chapterID)-reciter-\(AppSettings.reciterID).mp3")
        return FileManager.default.fileExists(atPath: url.path) ? url : nil
    }
}
