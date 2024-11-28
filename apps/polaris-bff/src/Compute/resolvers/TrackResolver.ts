import { Query, Resolver } from "type-graphql"
import { Track } from "../models/Track"
import { Author } from "../models/Author"

@Resolver()
export class TrackResolver {
  @Query(() => [Track])
  async tracksForHome(): Promise<Track[]> {
    // Mock data
    const tracks = [...new Array(6)].map(() => {
      const author: Author = {
        id: "author_01",
        name: "Grumpy Cat",
        photo:
          "https://res.cloudinary.com/apollographql/image/upload/v1730818804/odyssey/lift-off-api/catstrophysicist_bqfh9n_j0amow.jpg",
      }

      return {
        id: "track_01",
        title: "Astro Kitty, Space Explorer",
        author,
        description: "Explore the galaxy in a spaceship built by cats",
        thumbnail:
          "https://res.cloudinary.com/apollographql/image/upload/v1730818804/odyssey/lift-off-api/nebula_cat_djkt9r_nzifdj.jpg",
        length: 1210,
        modulesCount: 6,
      } as Track
    })

    return tracks
  }
}
